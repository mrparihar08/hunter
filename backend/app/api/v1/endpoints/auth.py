from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user, require_role
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.user import Token, UserCreate, UserResponse

router = APIRouter()


@router.get("/setup-status")
async def get_setup_status(db: AsyncSession = Depends(get_db)):
    """Checks whether the initial workspace owner has been set up."""
    stmt = select(User)
    result = await db.execute(stmt)
    has_owner = result.scalars().first() is not None
    return {"is_initialized": has_owner}


@router.post("/bootstrap-owner", response_model=Token)
async def bootstrap_owner(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """Initializes the primary workspace owner account (only allowed when 0 users exist)."""
    stmt = select(User)
    result = await db.execute(stmt)
    if result.scalars().first() is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Workspace owner is already initialized. Please login.",
        )

    owner = User(
        email=user_in.email.lower().strip(),
        full_name=user_in.full_name.strip(),
        hashed_password=get_password_hash(user_in.password),
        role=UserRole.OWNER_ADMIN,
        is_active=True,
    )
    db.add(owner)
    await db.commit()
    await db.refresh(owner)

    token = create_access_token(subject=owner.id)
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(owner),
    )


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).where(User.email == form_data.username.lower().strip())
    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account",
        )

    access_token = create_access_token(subject=user.id)
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.post("/register-collaborator", response_model=UserResponse)
async def register_collaborator(
    user_in: UserCreate,
    current_user: User = Depends(require_role(UserRole.OWNER_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only endpoint to invite/register trusted friends."""
    stmt = select(User).where(User.email == user_in.email.lower().strip())
    result = await db.execute(stmt)
    existing = result.scalars().first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists",
        )

    new_user = User(
        email=user_in.email.lower().strip(),
        full_name=user_in.full_name.strip(),
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return UserResponse.model_validate(new_user)
