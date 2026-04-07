from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.security import OAuth2PasswordBearer
import io
import re
import pdfplumber
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, text, cast, String # Added these
from ..db.database import SessionLocal
from ..db import models, schemas
from datetime import date, datetime, timedelta
from typing import Optional
from dotenv import load_dotenv
from passlib.context import CryptContext
from jose import JWTError, jwt
import os

load_dotenv()

router = APIRouter()

pwd_context = CryptContext(
    schemes=["pbkdf2_sha256", "bcrypt"],
    deprecated="auto",
)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/users/login")
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "supersecretkey")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_password(plain_password: str, hashed_password: str):
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except ValueError:
        return False


def get_password_hash(password: str):
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = get_user_by_email(db, email)
    if user is None:
        raise credentials_exception
    return user

@router.get("/health")
def check_health():
    return {
        'status': 'alive'
    }

@router.get("/metadata/enums")
def get_enums():
    return {
        "account_types": [e.value for e in models.AccountType],
        "account_purposes": [e.value for e in models.AccountPurpose],
        "transaction_types": [e.value for e in models.TransactionType]
    }

@router.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = models.User(
        name=user.name,
        email=user.email,
        hashed_password=get_password_hash(user.password)
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/users/login", response_model=schemas.Token)
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = authenticate_user(db, user.email, user.password)
    if not db_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(
        data={"sub": db_user.email, "user_id": db_user.id}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.get("/users/", response_model=list[schemas.User])
def list_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()

@router.put("/users/{user_id}", response_model=schemas.User)
def update_user(user_id: int, user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    update_data = user.dict(exclude_unset=True)
    if "password" in update_data:
        db_user.hashed_password = get_password_hash(update_data.pop("password"))
    for key, value in update_data.items():
        setattr(db_user, key, value)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.post("/accounts/")
def create_account(account: schemas.AccountCreate, db: Session = Depends(get_db)):
    db_account = models.Account(**account.dict())
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account

@router.get("/accounts/{user_id}")
def get_user_accounts(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.Account).filter(models.Account.user_id == user_id).all()

@router.get("/accounts/")
def get_accounts(db: Session = Depends(get_db)):
    return db.query(models.Account).all()

# Check that this says @router.put or @app.put
@router.put("/accounts/{account_id}", response_model=schemas.Account)
def update_account(account_id: int, account: schemas.AccountCreate, db: Session = Depends(get_db)):
    db_account = db.query(models.Account).filter(models.Account.id == account_id).first()
    if not db_account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Update the fields
    update_data = account.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_account, key, value)
    
    db.commit()
    db.refresh(db_account)
    return db_account

@router.delete("/accounts/{account_id}")
def delete_account(account_id: int, db: Session = Depends(get_db)):
    db_account = db.query(models.Account).filter(models.Account.id == account_id).first()
    if not db_account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    db.delete(db_account)
    db.commit()
    return {"message": "Account deleted successfully"}

@router.post("/categories/")
def create_category(category: schemas.CategoryCreate, db: Session = Depends(get_db)):
    db_cat = models.Category(**category.dict())
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat

@router.put("/categories/{category_id}", response_model=schemas.Category)
def update_category(category_id: int, category: schemas.CategoryCreate, db: Session = Depends(get_db)):
    db_cat = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    for key, value in category.dict().items():
        setattr(db_cat, key, value)
        
    db.commit()
    db.refresh(db_cat)
    return db_cat

@router.get("/categories/")
def get_categories(db: Session = Depends(get_db)):
    # This returns the tree structure for your React dropdowns
    return db.query(models.Category).all()

@router.post("/transactions/", response_model=schemas.TransactionCreate)
def create_transaction(transaction: schemas.TransactionCreate, db: Session = Depends(get_db)):
    # 1. Create the database object
    db_transaction = models.Transaction(**transaction.dict())
    
    # 2. Update Account Balances (Logic Layer)
    # If Expense: Subtract from from_account
    if transaction.type == models.TransactionType.EXPENSE:
        account = db.query(models.Account).filter(models.Account.id == transaction.from_account_id).first()
        if account:
            account.balance -= transaction.amount
            
    # If Income: Add to to_account
    elif transaction.type == models.TransactionType.INCOME:
        account = db.query(models.Account).filter(models.Account.id == transaction.to_account_id).first()
        if account:
            account.balance += transaction.amount
            
    # If Transfer: Move from one to another
    elif transaction.type == models.TransactionType.TRANSFER:
        from_acc = db.query(models.Account).filter(models.Account.id == transaction.from_account_id).first()
        to_acc = db.query(models.Account).filter(models.Account.id == transaction.to_account_id).first()
        if from_acc and to_acc:
            from_acc.balance -= transaction.amount
            to_acc.balance += transaction.amount

    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@router.post("/transactions/bulk")
def create_transactions_bulk(data: schemas.TransactionBulkCreate, db: Session = Depends(get_db)):

    created = []
    skipped = []

    for transaction in data.transactions:

        # 🔒 Dedup check
        # if transaction.external_id:
        # if transaction:
        #     existing = db.query(models.Transaction).filter(
        #         "{models.Transaction.type}_{models.Transaction.date}_{models.Transaction.amount}_"  == transaction.external_id,
        #         models.Transaction.user_id == transaction.user_id
        #     ).first()

        #     if existing:
        #         skipped.append(transaction.external_id)
        #         continue

        db_transaction = models.Transaction(**transaction.dict())

        # 💰 Balance logic
        if transaction.type == models.TransactionType.EXPENSE:
            account = db.query(models.Account).filter(models.Account.id == transaction.from_account_id).first()
            if account:
                account.balance -= transaction.amount

        elif transaction.type == models.TransactionType.INCOME:
            account = db.query(models.Account).filter(models.Account.id == transaction.to_account_id).first()
            if account:
                account.balance += transaction.amount

        elif transaction.type == models.TransactionType.TRANSFER:
            from_acc = db.query(models.Account).filter(models.Account.id == transaction.from_account_id).first()
            to_acc = db.query(models.Account).filter(models.Account.id == transaction.to_account_id).first()
            if from_acc and to_acc:
                from_acc.balance -= transaction.amount
                to_acc.balance += transaction.amount

        db.add(db_transaction)
        created.append(db_transaction)

    db.commit()

    return {
        "created_count": len(created),
        "created": created
    }

# @router.get("/transactions/")
# def get_transactions(user_id: Optional[int] = None, db: Session = Depends(get_db)):
#     query = db.query(models.Transaction)
#     if user_id:
#         query = query.filter(models.Transaction.user_id == user_id)
#     return query.order_by(models.Transaction.date.desc()).all()

@router.get("/transactions/")
def get_transactions(
    month: Optional[int] = None, 
    year: Optional[int] = None, 
    start_date: Optional[date] = None, 
    end_date: Optional[date] = None,
    user_id: Optional[int] = None,
    category_id: Optional[int] = None,
    type: Optional[models.TransactionType] = None,
    account_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    # 1. Reuse the same dynamic date logic
    if start_date and end_date:
        date_criteria = [models.Transaction.date.between(start_date, end_date)]
    else:
        target_month = month if month is not None else date.today().month
        target_year = year if year is not None else date.today().year
        date_criteria = [
            extract('month', models.Transaction.date) == target_month,
            extract('year', models.Transaction.date) == target_year
        ]
    # Add user filter if provided
    if user_id is not None:
        date_criteria.append(models.Transaction.user_id == user_id)
    # Add category filter if provided
    if category_id is not None:
        date_criteria.append(models.Transaction.category_id == category_id)
    # Add type filter if provided
    if type is not None:
        date_criteria.append(models.Transaction.type == type)
    # Add account filter if provided
    if account_id is not None:
        date_criteria.append((models.Transaction.from_account_id == account_id) | (models.Transaction.to_account_id == account_id))


    # 2. Query with the filters
    transactions = db.query(models.Transaction).filter(*date_criteria).order_by(models.Transaction.date.desc()).all()
    
    return transactions

@router.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    # 1. Fetch the transaction
    db_transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # 2. Get the associated account(s)
    from_account = db.query(models.Account).filter(models.Account.id == db_transaction.from_account_id).first()
    to_account = db.query(models.Account).filter(models.Account.id == db_transaction.to_account_id).first() if db_transaction.to_account_id else None

    # 3. REVERT the balances
    if db_transaction.type == "EXPENSE":
        # If we delete an expense, the money comes BACK to the account
        if from_account:
            from_account.balance += db_transaction.amount

    elif db_transaction.type == "INCOME":
        # If we delete income, the money is REMOVED from the account
        if to_account:
            to_account.balance -= db_transaction.amount

    elif db_transaction.type == "TRANSFER":
        # If we delete a transfer, undo the move
        # Add back to source, take away from destination
        if from_account:
            from_account.balance += db_transaction.amount
        if to_account:
            to_account.balance -= db_transaction.amount

    # 4. Finalize the deletion
    db.delete(db_transaction)
    db.commit()
    
    return {"msg": "Transaction deleted and account balance reverted"}

def get_all_descendant_ids(parent_id: int, db: Session):
    ids = [parent_id]
    children = db.query(models.Category.id).filter(models.Category.parent_id == parent_id).all()
    for child in children:
        ids.extend(get_all_descendant_ids(child.id, db))
    return ids

def get_category_breakdown(root_id: int, root_target: float, month: int, year: int, db: Session):
    children = db.query(models.Category).filter(models.Category.parent_id == root_id).all()
    breakdown = []
    
    for child in children:
        branch_ids = get_all_descendant_ids(child.id, db)
        total_spent = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.category_id.in_(branch_ids),
            extract('month', models.Transaction.date) == month,
            extract('year', models.Transaction.date) == year,
            models.Transaction.type == models.TransactionType.EXPENSE
        ).scalar() or 0
        
        # Adjusting for 0-100 scale: Divide by 100
        sub_percentage_raw = float(child.percentage or 0)
        sub_target = root_target * (sub_percentage_raw / 100)
        
        breakdown.append({
            "name": child.name,
            "percentage": int(sub_percentage_raw), # Now sends 20 instead of 0.2
            "target_amount": float(sub_target),
            "covered_amount": float(total_spent),
            "remaining": max(0, float(sub_target) - float(total_spent))
        })
    return breakdown

def get_category_node(category, date_criteria, db: Session, base_amount: float, user_id: Optional[int] = None):
    current_target = base_amount * (float(category.percentage or 0) / 100)
    all_branch_ids = get_all_descendant_ids(category.id, db)
    user_criteria = [models.Transaction.user_id == user_id] if user_id is not None else []
    
    total_spent = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.category_id.in_(all_branch_ids),
        models.Transaction.type.in_([models.TransactionType.EXPENSE, models.TransactionType.TRANSFER]),
        *date_criteria,
        *user_criteria
    ).scalar() or 0

    children = db.query(models.Category).filter(models.Category.parent_id == category.id).all()
    sub_categories = [get_category_node(c, date_criteria, db, current_target, user_id) for c in children]

    return {
        "name": category.name,
        "id": category.id,
        "target_amount": float(current_target),
        "covered_amount": float(total_spent),
        "sub_categories": sub_categories,
        "percentage": int(category.percentage or 0)
    }

@router.get("/budget/summary")
def get_budget_dashboard(
    month: Optional[int] = None, 
    year: Optional[int] = None, 
    start_date: Optional[date] = None, 
    end_date: Optional[date] = None,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    # 1. Build the Dynamic Date Filter
    if start_date and end_date:
        # Use Custom Range
        date_criteria = [models.Transaction.date.between(start_date, end_date)]
    else:
        # Use Month/Year (Default to current if not provided)
        target_month = month if month is not None else date.today().month
        target_year = year if year is not None else date.today().year
        date_criteria = [
            extract('month', models.Transaction.date) == target_month,
            extract('year', models.Transaction.date) == target_year
        ]

    # 2. Income Query using the criteria
    monthly_income_filters = [
        models.Account.account_type == models.AccountType.SAVINGS,
        models.Transaction.type == models.TransactionType.INCOME,
        *date_criteria
    ]
    monthly_expense_filters = [
        models.Transaction.type == models.TransactionType.EXPENSE,
        *date_criteria
    ]
    monthly_transfer_filters = [
        models.Transaction.type == models.TransactionType.TRANSFER,
        *date_criteria
    ]
    if user_id is not None:
        monthly_income_filters.append(models.Transaction.user_id == user_id)
        monthly_expense_filters.append(models.Transaction.user_id == user_id)
        monthly_transfer_filters.append(models.Transaction.user_id == user_id)

    monthly_income = db.query(func.sum(models.Transaction.amount)).join(
        models.Account, models.Transaction.to_account_id == models.Account.id
    ).filter(*monthly_income_filters).scalar() or 0

    monthly_expense = db.query(func.sum(models.Transaction.amount)).join(
        models.Category, models.Transaction.category_id == models.Category.id
    ).filter(*monthly_expense_filters).scalar() or 0

    monthly_transfer = db.query(func.sum(models.Transaction.amount)).filter(*monthly_transfer_filters).scalar() or 0

    roots = db.query(models.Category).filter(models.Category.parent_id == None).all()
    
    # Update get_category_node to accept the date_criteria list
    return {
        "monthly_income": float(monthly_income),
        "monthly_expense": float(monthly_expense),
        "monthly_transfer": float(monthly_transfer),
        "buckets": [
            get_category_node(root, date_criteria, db, float(monthly_income), user_id) 
            for root in roots
        ]
    }

def calculate_allocation(category_name, target_fund, db: Session):
    category = (
        db.query(models.Category)
        .filter(models.Category.name == category_name)
        .first()
    )

    if not category or not category.children:
        return {}

    total_percentage = sum(child.percentage or 0 for child in category.children)

    if total_percentage != 100:
        raise ValueError("Total percentage must be 100")

    return {
        child.name: round((child.percentage / 100) * target_fund, 2)
        for child in category.children
    }

@router.get("/emergency/status")
def get_emergency_radar(db: Session = Depends(get_db)):
    # 1. Identify Safety Net Accounts (Emergency Purpose OR Liquid Funds)
    safety_accounts = db.query(models.Account).filter(
        (models.Account.purpose == "EMERGENCY")
    ).all()
    
    total_emergency_cash = sum(float(acc.balance) for acc in safety_accounts)

    # 2. Calculate Avg Monthly Expense (Last 90 days)
    # We sum all expenses from the last 3 months and divide by 3
    three_months_ago = date.today().replace(month=date.today().month-3 if date.today().month > 3 else 1)
    total_past_expenses = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.type == models.TransactionType.EXPENSE,
        models.Transaction.date >= three_months_ago
    ).scalar() or 0
    
    # avg_monthly_expense = float(total_past_expenses) / 3
    avg_monthly_expense = 150_000 # Placeholder for testing, replace with actual calculation above
    if avg_monthly_expense == 0: avg_monthly_expense = 150000 # Fallback 

    # 3. Calculate Runway and Target
    runway_months = round(total_emergency_cash / avg_monthly_expense, 1) if avg_monthly_expense > 0 else 0
    target_fund = avg_monthly_expense * 6 # 6-month safety net goal

    category = calculate_allocation("Emergency", target_fund, db)

    return {
        "avg_monthly_expense": avg_monthly_expense,
        "total_emergency_cash": total_emergency_cash,
        "runway_months": runway_months,
        "target_fund": target_fund,
        "progress_percent": min((total_emergency_cash / target_fund) * 100, 100) if target_fund > 0 else 0,
        "category_distribution": category,
        "safety_nets": [
            {
                "id": acc.id,
                "name": acc.name,
                "purpose": acc.purpose,
                "account_type": acc.account_type,
                "balance": float(acc.balance)
            } for acc in safety_accounts
        ]
    }

@router.get("/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    today = date.today()
    start_of_month = today.replace(day=1)
    
    # 1. Net Worth (Total of all accounts)
    accounts = db.query(models.Account).all()
    net_worth = sum(float(acc.balance) for acc in accounts)
    
    # 2. Monthly Cash Flow
    income = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.type == models.TransactionType.INCOME,
        models.Transaction.date >= start_of_month
    ).scalar() or 0
    
    expenses = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.type == models.TransactionType.EXPENSE,
        models.Transaction.date >= start_of_month
    ).scalar() or 0

    # 3. Category Breakdown (For Pie Chart)
    category_data = db.query(
        models.Category.name, 
        func.sum(models.Transaction.amount)
    ).join(models.Transaction).filter(
        models.Transaction.type == models.TransactionType.EXPENSE,
        models.Transaction.date >= start_of_month
    ).group_by(models.Category.name).all()

    return {
        "net_worth": net_worth,
        "monthly_income": float(income),
        "monthly_expenses": float(expenses),
        "savings_rate": round(((float(income) - float(expenses)) / float(income) * 100), 1) if income > 0 else 0,
        "chart_data": [{"name": c[0], "value": float(c[1])} for c in category_data]
    }

@router.get("/dashboard/insights")
def get_dynamic_insights(
    user_id: Optional[int] = None,
    start: Optional[date] = None,
    end: Optional[date] = None,
    db: Session = Depends(get_db)
):
    today = date.today()
    start_of_month = today.replace(day=1)
    start_date = start or start_of_month
    end_date = end or today
    if end_date > today:
        end_date = today
    if start_date > end_date:
        start_date = end_date

    days_passed = max((end_date - start_date).days + 1, 1)
    user_criteria = [models.Transaction.user_id == user_id] if user_id is not None else []

    expenses_this_month = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.type == models.TransactionType.EXPENSE,
        models.Transaction.date >= start_date,
        models.Transaction.date <= end_date,
        *user_criteria
    ).scalar() or 0
    daily_burn = float(expenses_this_month) / days_passed

    # 2. Identify the "Leak" (Top Expense Category)
    top_leak = db.query(
        models.Category.name, 
        func.sum(models.Transaction.amount).label('total')
    ).join(models.Transaction).filter(
        models.Transaction.type == models.TransactionType.EXPENSE,
        models.Transaction.date >= start_date,
        models.Transaction.date <= end_date,
        *user_criteria
    ).group_by(models.Category.name).order_by(text('total DESC')).first()

    # 3. Investment Consistency
    investment_category = db.query(models.Category).filter(models.Category.name.ilike("%Investment%")) .first()
    if investment_category:
        investment_category_ids = get_all_descendant_ids(investment_category.id, db)
        investment_total = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.category_id.in_(investment_category_ids),
            models.Transaction.type.in_([models.TransactionType.EXPENSE, models.TransactionType.TRANSFER]),
            models.Transaction.date >= start_date,
            models.Transaction.date <= end_date,
            *user_criteria
        ).scalar() or 0
    else:
        investment_total = db.query(func.sum(models.Transaction.amount)).join(models.Category).filter(
            models.Category.name.ilike("%Investment%"),
            models.Transaction.date >= start_date,
            models.Transaction.date <= end_date,
            *user_criteria
        ).scalar() or 0

    # 4. Generate Dynamic Suggestion Logic
    suggestion = "Your cash flow is healthy. Consider increasing your Liquid Fund floor."
    if daily_burn > 5000: # Example threshold
        suggestion = f"Warning: Your daily burn is high. {top_leak[0] if top_leak else 'Spending'} is the primary driver."
    elif investment_total == 0:
        suggestion = "You haven't moved any money to Investments yet. Is the strategy on track?"

    return {
        "daily_burn": round(daily_burn, 0),
        "top_leak": top_leak[0] if top_leak else "None",
        "top_leak_amt": float(top_leak[1]) if top_leak else 0,
        "investment_ratio": round((float(investment_total) / float(expenses_this_month or 1)) * 100, 1),
        "suggestion": suggestion,
        "vibe_score": "Good" if daily_burn < 3000 else "Aggressive" # Dynamic status
    }

@router.post("/milestones", response_model=schemas.Milestone)
def create_milestone(milestone: schemas.MilestoneCreate, db: Session = Depends(get_db)):
    # FastAPI will validate the JSON body against MilestoneCreate
    print(f"Creating milestone: {milestone}")
    new_m = models.Milestone(
        name=milestone.name,
        target_amount=milestone.target_amount,
        deadline=milestone.deadline,
        category_id=milestone.category_id,
    )
    db.add(new_m)
    db.commit()
    db.refresh(new_m)
    return new_m

@router.get("/milestones/status")
def get_milestones_status(db: Session = Depends(get_db)):
    milestones = db.query(models.Milestone).all()
    results = []
    for m in milestones:
        # Calculate progress from transactions in the linked category
        progress = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.category_id == m.category_id
        ).scalar() or 0
        
        days_left = (m.deadline - date.today()).days
        months_left = max(1, days_left / 30)
        
        results.append({
            "id": m.id,
            "name": m.name,
            "target": m.target_amount,
            "current": float(progress),
            "monthly_required": round((m.target_amount - float(progress)) / months_left, 2),
            "percent": round((float(progress) / m.target_amount) * 100, 1),
            "days_left": days_left
        })
    return results

@router.delete("/milestones/{milestone_id}")
def delete_milestone(milestone_id: int, db: Session = Depends(get_db)):
    milestone = db.query(models.Milestone).filter(models.Milestone.id == milestone_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    db.delete(milestone)
    db.commit()
    return {"message": "Milestone deleted successfully"}

# ----------- HELPERS -----------

def is_valid_date(text):
    # Simple regex for DD.MM.YYYY format
    if bool(re.match(r"\d{2}\.\d{2}\.\d{4}", text)):
        return True
    # for DD MMM YYYY format, you can use:
    if bool(re.match(r"\d{2} [A-Za-z]{3} \d{4}", text)):
        return True
    return False


def parse_amount(prev_balance, current_balance, withdrawal, deposit):
    # ✅ First transaction → use extracted values
    if prev_balance is None:
        if withdrawal:
            return -float(withdrawal.replace(",", ""))
        elif deposit:
            return float(deposit.replace(",", ""))
        return 0.0

    # ✅ बाकी transactions → use balance diff (most accurate)
    return round(current_balance - prev_balance, 2)


def categorize(desc):
    desc = desc.lower()

    if "upi" in desc:
        return "UPI"
    if "amazon" in desc or "flipkart" in desc or "meesho" in desc:
        return "Shopping"
    if "swiggy" in desc or "zomato" in desc or "food" in desc:
        return "Food"
    if "petrol" in desc or "fuel" in desc:
        return "Fuel"
    if "netflix" in desc or "spotify" in desc:
        return "Subscription"
    if "atm" in desc or "cash wdl" in desc:
        return "Cash Withdrawal"
    if "loan" in desc or "emi" in desc:
        return "Loan/EMI"
    if "salary" in desc:
        return "Income"
    if "zerodha" in desc:
        return "Investment"

    return "Others"


def clean_text(text):
    if not text:
        return ""
    return " ".join(text.split())  # remove line breaks


# ----------- CORE PARSER -----------

def extract_amounts(parts):
    numbers = []

    for p in parts:
        if re.match(r"^\d+(\.\d{1,2})?$", p):
            numbers.append(p)
    
    if not numbers:
        return "", "", 0.0

    balance = float(numbers[-1])

    withdrawal = ""
    deposit = ""

    if len(numbers) == 2:
        # Only one amount + balance (we will decide later using balance diff)
        withdrawal = numbers[0]

    elif len(numbers) >= 3:
        # ✅ Correct order for ICICI
        withdrawal = numbers[-2]
        deposit = numbers[-2]

    return withdrawal, deposit, balance

def parse_transactions(pdf_stream):
    transactions = []

    with pdfplumber.open(pdf_stream) as pdf:
        prev_balance = None  # ✅ track previous balance

        for page in pdf.pages:
            words = page.extract_text()

            if not words:
                continue

            lines = words.split("\n")

            current = None

            for line in lines:
                parts = line.split()
                # 🚀 Detect start of transaction
                if len(parts) >= 3 and parts[0].isdigit() and is_valid_date(parts[1]):

                    if current:
                        transactions.append(current)

                    date = parts[1]

                    withdrawal, deposit, balance = extract_amounts(parts)
                    # print(parts)

                    description = " ".join(parts[2:])
                    # print(description)
                    # description = re.sub(r"\d+(\.\d{1,2})?$", "", description).strip()

                    current = {
                        "date": date,
                        "description": clean_text(description),
                        "amount": 0.0,  # temp
                        "balance": balance,
                        "category": categorize(description),
                    }

                    # ✅ FIX: correct signed amount using balance diff
                    current["amount"] = parse_amount(
                        prev_balance,
                        balance,
                        withdrawal,
                        deposit
                    )
                    prev_balance = balance  # update for next txn

                else:
                    if current:
                        current["description"] += " " + clean_text(line)

            if current:
                transactions.append(current)

    return transactions


def extract_amounts_kotak(parts):
    numbers = []

    for p in parts:
        if re.match(r"^(?:\d+\.\d{2}|\d{1,3}(?:,\d{3})+\.\d{2}|\d{1,3}(?:,\d{2})+(?:,\d{3})\.\d{2})$", p):
            p = p.replace(",", "")
            numbers.append(p)

    if not numbers:
        return "", "", 0.0

    balance = float(numbers[-1])

    withdrawal = ""
    deposit = ""

    if len(numbers) == 2:
        # Only one amount + balance (we will decide later using balance diff)
        withdrawal = numbers[0]

    elif len(numbers) >= 3:
        # ✅ Correct order for ICICI
        withdrawal = numbers[-2]
        deposit = numbers[-2]

    return withdrawal, deposit, balance

def parse_transactions_kotak(pdf_stream):
    transactions = []

    with pdfplumber.open(pdf_stream) as pdf:
        prev_balance = None  # ✅ track previous balance

        for page in pdf.pages:
            words = page.extract_text()

            if not words:
                continue

            lines = words.split("\n")

            current = None

            for line in lines:
                parts = line.split()
                # 🚀 Detect start of transaction
                # print(parts)
                if len(parts) >= 4 and parts[0].isdigit() and is_valid_date(parts[1] + " " + parts[2] + " " + parts[3]):

                    if current:
                        transactions.append(current)

                    month_map = {
                        "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04",
                        "May": "05", "Jun": "06", "Jul": "07", "Aug": "08",
                        "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12"
                    }

                    day = parts[1]
                    month = month_map[parts[2]]
                    year = parts[3]

                    date = f"{day}.{month}.{year}"

                    withdrawal, deposit, balance = extract_amounts_kotak(parts)

                    description = " ".join(parts[2:])
                    # description = re.sub(r"\d+(\.\d{1,2})?$", "", description).strip()

                    current = {
                        "date": date,
                        "description": clean_text(description),
                        "amount": 0.0,  # temp
                        "balance": balance,
                        "category": categorize(description),
                    }

                    # ✅ FIX: correct signed amount using balance diff
                    current["amount"] = parse_amount(
                        prev_balance,
                        balance,
                        withdrawal,
                        deposit
                    )
                    prev_balance = balance  # update for next txn

                else:
                    if current:
                        current["description"] += " " + clean_text(line)

            if current:
                transactions.append(current)

    return transactions

def generate_summary(transactions):
    summary = {}

    for t in transactions:
        cat = t.get("category", "Others")
        amt = t.get("amount") or 0

        if cat not in summary:
            summary[cat] = 0

        summary[cat] += amt

    return summary

# ----------- API -----------

@router.post("/read-statement")
async def upload_pdf(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF allowed")

    contents = await file.read()

    pdf_stream = io.BytesIO(contents)

    transactions = parse_transactions(pdf_stream)

    if not transactions:
        transactions = parse_transactions_kotak(pdf_stream)

    if not transactions:
        return {"success": False, "message": "No transactions found"}

    return {
        "success": True,
        "count": len(transactions),
        "transactions": transactions,
        "summary": generate_summary(transactions)
    }


import cloudinary.uploader
from PyPDF2 import PdfReader, PdfWriter

@router.post("/upload-medical")
async def upload_medical_report(
    file: UploadFile = File(...),                    # Explicitly mark as File
    patient_name: str = Form(...),                   # Explicitly mark as Form
    report_type: str = Form(...),
    report_date: str = Form(...),
    tags: str = Form(None),                          # Form(None) makes it optional
    doctor_name: str = Form(None),
    is_critical: str = Form("false"),               # Forms send booleans as strings
    crop_pages: str = Form(None),                    # Optional, default to None
    db: Session = Depends(get_db)                    # Don't forget your DB session!
):
    if crop_pages is not None:
        try:
            start_page, end_page = map(int, crop_pages.split('-'))
        except ValueError:
            raise ValueError("Invalid page range format. Use 'start-end' (e.g., '1-3')")
    else:
        start_page = 0
        end_page = None

    if end_page is not None and end_page >= start_page:
        # Read the PDF and extract the specified page range before uploading
        reader = PdfReader(file.file)  # Use file.file to get the actual file object for PyPDF2
        writer = PdfWriter()
        for page_num in range(start_page, end_page + 1):
            if page_num < len(reader.pages):
                writer.add_page(reader.pages[page_num])
        
        output_pdf = io.BytesIO()
        writer.write(output_pdf)
        output_pdf.seek(0)
        file.file = output_pdf  # Replace the original file with the extracted page range for upload

    # Convert 'is_critical' string to actual boolean if needed
    critical_bool = is_critical.lower() == "true"

    # 1. Upload to Cloudinary
    # Use file.file to get the actual spooled file object
    upload_result = cloudinary.uploader.upload(
        file.file, 
        folder=os.getenv("CLOUDINARY_FOLDER", "medical_app/local"),
        resource_type="auto"
    )
    
    file_url = upload_result.get("secure_url")
    p_id = upload_result.get("public_id")

    # 2. Save to DB
    new_record = models.MedicalRecord(
        patient_name=patient_name,
        report_type=report_type,
        report_date=date.fromisoformat(report_date),
        cloudinary_url=file_url,
        public_id=p_id,
        tags=tags,
        doctor_name=doctor_name,
        is_critical=critical_bool
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    
    return new_record

@router.get("/medical-reports")
def get_reports(search_term: str = None, critical: bool = None, db: Session = Depends(get_db)):
    query = db.query(models.MedicalRecord)

    limit = None

    if search_term:
        term = search_term.lower().strip()

        if term == "all":
            search_term = None
            critical = None

        elif term.startswith("last"):
            try:
                limit = int(term.split()[1])  # extract number
                search_term = None
                critical = None
            except (IndexError, ValueError):
                raise ValueError("Invalid format. Use 'last 20', 'last 30', etc.")
        else:
            search_term = term
        

    if search_term:
        query = query.filter(
            (models.MedicalRecord.patient_name.icontains(search_term)) |
            (models.MedicalRecord.report_type.icontains(search_term)) |
            (models.MedicalRecord.tags.icontains(search_term)) |
            (models.MedicalRecord.doctor_name.icontains(search_term)) |
            (cast(models.MedicalRecord.report_date, String).icontains(search_term))
        )
    
    if critical is not None:
        query = query.filter(models.MedicalRecord.is_critical == critical)
    
    if limit:
        query = query.order_by(models.MedicalRecord.report_date.desc()).limit(limit)
    else:
        query = query.order_by(models.MedicalRecord.report_date.desc())

    # Sort by date so newest is always on top for the doctor
    return query.all()

@router.delete("/medical-reports/{record_id}")
def delete_medical_record(record_id: int, db: Session = Depends(get_db)):
    # 1. Find the record in your DB
    record = db.query(models.MedicalRecord).filter(models.MedicalRecord.id == record_id).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    try:
        # 2. Delete the file from Cloudinary using the stored public_id
        # Note: If it's a PDF, you might need resource_type="raw" or "auto"
        cloudinary.uploader.destroy(record.public_id, resource_type="image")
        
        # 3. Delete the row from your SQLite database
        db.delete(record)
        db.commit()
        
        return {"message": "Record and file deleted successfully"}
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error during deletion: {str(e)}")


@router.post("/diabetes-records/", response_model=schemas.DiabetesRecord)
def create_diabetes_record(record: schemas.DiabetesRecordCreate, db: Session = Depends(get_db)):
    existing = db.query(models.DiabetesRecord).filter(
        models.DiabetesRecord.patient_name == record.patient_name,
        models.DiabetesRecord.record_date == record.record_date,
        models.DiabetesRecord.reading_type == record.reading_type,
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail='A reading of this type already exists for this patient on the selected date.',
        )

    new_record = models.DiabetesRecord(
        patient_name=record.patient_name,
        record_date=record.record_date,
        reading_type=record.reading_type,
        reading_value=record.reading_value,
        reading_time=record.reading_time,
        notes=record.notes,
        insulin_action=record.insulin_action,
        insulin_dosage=record.insulin_dosage,
        needle_changed=record.needle_changed,
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return new_record


@router.delete("/diabetes-records/{record_id}")
def delete_diabetes_record(record_id: int, db: Session = Depends(get_db)):
    record = db.query(models.DiabetesRecord).filter(models.DiabetesRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Diabetes record not found")
    db.delete(record)
    db.commit()
    return {"message": "Diabetes record deleted successfully"}


def parse_optional_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid date format: {value}. Expected YYYY-MM-DD.")


@router.get("/diabetes-records/")
def get_diabetes_records(
    period: str = "month",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    patient_name: Optional[str] = None,
    reading_type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.DiabetesRecord)

    if patient_name:
        term = patient_name.lower().strip()
        query = query.filter(models.DiabetesRecord.patient_name.ilike(f"%{term}%"))

    if reading_type:
        query = query.filter(models.DiabetesRecord.reading_type == reading_type)

    parsed_start = parse_optional_date(start_date)
    parsed_end = parse_optional_date(end_date)

    if period == "week":
        parsed_start = date.today() - timedelta(days=7)
        parsed_end = date.today()
    elif period == "month":
        parsed_start = date.today() - timedelta(days=30)
        parsed_end = date.today()
    elif period == "all":
        parsed_start = None
        parsed_end = None

    if period == "custom" and parsed_start and parsed_end:
        pass

    if parsed_start:
        query = query.filter(models.DiabetesRecord.record_date >= parsed_start)
    if parsed_end:
        query = query.filter(models.DiabetesRecord.record_date <= parsed_end)

    return query.order_by(models.DiabetesRecord.record_date.desc(), models.DiabetesRecord.id.desc()).all()