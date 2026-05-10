from sqlalchemy import String, JSON, ForeignKey, DateTime
from sqlalchemy.orm import relationship, Mapped, mapped_column
import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String, unique=True, index=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    board: Mapped["Board"] = relationship("Board", back_populates="owner", uselist=False)

class Board(Base):
    __tablename__ = "boards"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    state: Mapped[dict] = mapped_column(JSON)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, 
        default=datetime.datetime.utcnow, 
        onupdate=datetime.datetime.utcnow
    )

    owner: Mapped["User"] = relationship("User", back_populates="board")
