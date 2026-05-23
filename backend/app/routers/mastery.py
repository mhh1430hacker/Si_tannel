"""
Mastery Constellation Router.
Returns the static, slow-evolving node/edge graph for a user.
State ONLY updates on session completion or nightly CRON. Never mid-session.
"""

import uuid
import math

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import MasteryEdge, MasteryNode

router = APIRouter(prefix="/api/mastery", tags=["mastery-constellation"])


class NodeOut(BaseModel):
    id: int
    skill_category: str
    sub_skill: str
    mastery_level: float
    is_mastered: bool
    x: float
    y: float

    class Config:
        from_attributes = True


class EdgeOut(BaseModel):
    id: int
    source_node_id: int
    target_node_id: int
    weight: float
    x1: float
    y1: float
    x2: float
    y2: float

    class Config:
        from_attributes = True


class ConstellationOut(BaseModel):
    nodes: list[NodeOut]
    edges: list[EdgeOut]


def _compute_layout(nodes: list[MasteryNode]) -> dict[int, tuple[float, float]]:
    """
    Deterministic radial layout for constellation.
    Positions nodes in a circle within a 1000x500 viewBox.
    """
    positions: dict[int, tuple[float, float]] = {}
    count = len(nodes)
    if count == 0:
        return positions

    cx, cy = 500.0, 250.0
    radius = min(200.0, 150.0 + count * 20)

    for i, node in enumerate(nodes):
        angle = (2 * math.pi * i) / count
        x = cx + radius * math.cos(angle)
        y = cy + radius * math.sin(angle)
        positions[node.id] = (round(x, 1), round(y, 1))

    return positions


@router.get("/{user_id}", response_model=ConstellationOut)
def get_constellation(user_id: str, db: Session = Depends(get_db)):
    """
    Get the Mastery Constellation for a user.
    This is a STATIC snapshot — it does not change mid-session.
    Visual updates happen only on session completion or nightly CRON.
    """
    uid = uuid.UUID(user_id)

    nodes = (
        db.query(MasteryNode)
        .filter(MasteryNode.user_id == uid)
        .order_by(MasteryNode.skill_category)
        .all()
    )

    if not nodes:
        return ConstellationOut(nodes=[], edges=[])

    positions = _compute_layout(nodes)

    nodes_out = []
    for node in nodes:
        x, y = positions.get(node.id, (500.0, 250.0))
        nodes_out.append(
            NodeOut(
                id=node.id,
                skill_category=node.skill_category,
                sub_skill=node.sub_skill,
                mastery_level=round(node.mastery_level, 3),
                is_mastered=node.mastery_level >= 0.7,
                x=x,
                y=y,
            )
        )

    edges = (
        db.query(MasteryEdge)
        .filter(MasteryEdge.user_id == uid)
        .all()
    )

    edges_out = []
    for edge in edges:
        src_pos = positions.get(edge.source_node_id, (0, 0))
        tgt_pos = positions.get(edge.target_node_id, (0, 0))
        edges_out.append(
            EdgeOut(
                id=edge.id,
                source_node_id=edge.source_node_id,
                target_node_id=edge.target_node_id,
                weight=round(edge.weight, 3),
                x1=src_pos[0],
                y1=src_pos[1],
                x2=tgt_pos[0],
                y2=tgt_pos[1],
            )
        )

    return ConstellationOut(nodes=nodes_out, edges=edges_out)
