# -*- coding: utf-8 -*-
from fastapi import APIRouter
from ..services.counter import get_click_count, increment_click_count

router = APIRouter()


@router.get("/click-count")
async def click_count():
    return get_click_count()


_VALID_SERVICES = {"severance", "unemployment", "weekly_allowance", "annual_leave", "benefits"}

@router.post("/click/{service}")
async def register_click(service: str):
    if service not in _VALID_SERVICES:
        return {"error": "invalid service"}
    return increment_click_count(service)
