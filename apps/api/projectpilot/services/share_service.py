import secrets
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from projectpilot.persistence.base import utc_now
from projectpilot.persistence.models.share import SharedLink


class ShareService:
    @staticmethod
    def generate_token(prefix: str = "") -> str:
        raw = secrets.token_urlsafe(24).replace("-", "").replace("_", "")
        return f"{prefix}{raw}" if prefix else raw

    @classmethod
    async def get_or_create_shared_link(
        cls,
        db: AsyncSession,
        resource_type: str,
        resource_id: uuid.UUID,
        title: Optional[str] = None,
        user_id: Optional[uuid.UUID] = None,
    ) -> SharedLink:
        """Fetch active shared link or create a new one for the resource."""
        res = await db.execute(
            select(SharedLink).where(
                SharedLink.resource_type == resource_type,
                SharedLink.resource_id == resource_id,
            )
        )
        existing = res.scalars().first()
        if existing:
            if not existing.is_active:
                existing.is_active = True
                existing.updated_at = utc_now()
                await db.flush()
            return existing

        token = cls.generate_token()
        shared_link = SharedLink(
            token=token,
            resource_type=resource_type,
            resource_id=resource_id,
            title=title,
            is_active=True,
            view_count=0,
            created_by_user_id=user_id,
        )
        db.add(shared_link)
        await db.flush()
        return shared_link

    @classmethod
    async def get_shared_link_by_token(
        cls,
        db: AsyncSession,
        token: str,
        increment_view: bool = True,
    ) -> Optional[SharedLink]:
        """Resolve token to active shared link and optionally record view increment."""
        res = await db.execute(
            select(SharedLink).where(
                SharedLink.token == token,
                SharedLink.is_active == True,  # noqa: E712
            )
        )
        shared_link = res.scalar_one_or_none()
        if not shared_link:
            return None

        # Check optional expiration
        if shared_link.expires_at and shared_link.expires_at < utc_now():
            return None

        if increment_view:
            shared_link.view_count += 1
            shared_link.last_viewed_at = utc_now()
            await db.flush()

        return shared_link

    @classmethod
    async def get_active_token_for_resource(
        cls,
        db: AsyncSession,
        resource_type: str,
        resource_id: uuid.UUID,
    ) -> Optional[str]:
        """Quick lookup of active share token for a resource."""
        res = await db.execute(
            select(SharedLink.token).where(
                SharedLink.resource_type == resource_type,
                SharedLink.resource_id == resource_id,
                SharedLink.is_active == True,  # noqa: E712
            )
        )
        return res.scalar_one_or_none()

    @classmethod
    async def toggle_shared_link(
        cls,
        db: AsyncSession,
        resource_type: str,
        resource_id: uuid.UUID,
        is_active: bool,
    ) -> Optional[SharedLink]:
        """Enable or disable sharing for a resource."""
        res = await db.execute(
            select(SharedLink).where(
                SharedLink.resource_type == resource_type,
                SharedLink.resource_id == resource_id,
            )
        )
        shared_link = res.scalars().first()
        if shared_link:
            shared_link.is_active = is_active
            shared_link.updated_at = utc_now()
            await db.flush()
        return shared_link


share_service = ShareService()
