from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, text # Added these
from ..db.database import SessionLocal
from ..db import models, schemas
from datetime import date
from typing import Optional

router = APIRouter()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/metadata/enums")
def get_enums():
    return {
        "account_types": [e.value for e in models.AccountType],
        "account_purposes": [e.value for e in models.AccountPurpose],
        "transaction_types": [e.value for e in models.TransactionType]
    }

@router.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # In a real app, you'd hash the password here
    db_user = models.User(name=user.name, email=user.email, hashed_password=user.password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/users/")
def list_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()

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

@router.get("/emergency-fund/status")
def get_ef_status(db: Session = Depends(get_db)):
    fund = db.query(models.EmergencyFund).first()
    if not fund:
        return {"msg": "Emergency fund not configured"}
    
    # Calculate current balance from accounts tagged as 'EMERGENCY'
    accounts = db.query(models.Account).filter(models.Account.purpose == "EMERGENCY").all()
    current_balance = sum(acc.balance for acc in accounts)
    
    return {
        "target": fund.target_amount,
        "current": current_balance,
        "is_full": current_balance >= fund.target_amount,
        "gap": max(0, fund.target_amount - current_balance)
    }

@router.post("/emergency-fund/setup")
def setup_ef(amount: float, db: Session = Depends(get_db)):
    fund = db.query(models.EmergencyFund).first()
    if fund:
        fund.target_amount = amount
    else:
        fund = models.EmergencyFund(target_amount=amount)
        db.add(fund)
    db.commit()
    return fund

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

def get_category_node(category, date_criteria, db: Session, base_amount: float):
    current_target = base_amount * (float(category.percentage or 0) / 100)
    all_branch_ids = get_all_descendant_ids(category.id, db)
    
    # Apply the same date_criteria here
    total_spent = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.category_id.in_(all_branch_ids),
        models.Transaction.type.in_([models.TransactionType.EXPENSE, models.TransactionType.TRANSFER]),
        *date_criteria 
    ).scalar() or 0

    children = db.query(models.Category).filter(models.Category.parent_id == category.id).all()
    sub_categories = [get_category_node(c, date_criteria, db, current_target) for c in children]

    return {
        "name": category.name,
        "target_amount": float(current_target),
        "covered_amount": float(total_spent),
        "sub_categories": sub_categories
    }

@router.get("/budget/summary")
def get_budget_dashboard(
    month: Optional[int] = None, 
    year: Optional[int] = None, 
    start_date: Optional[date] = None, 
    end_date: Optional[date] = None,
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
    monthly_income = db.query(func.sum(models.Transaction.amount)).join(
        models.Account, models.Transaction.to_account_id == models.Account.id
    ).filter(
        models.Account.account_type == models.AccountType.SAVINGS,
        models.Transaction.type == models.TransactionType.INCOME,
        *date_criteria  # This unpacks either the range or the month/year
    ).scalar() or 0

    roots = db.query(models.Category).filter(models.Category.parent_id == None).all()
    
    # Update get_category_node to accept the date_criteria list
    return {
        "monthly_income": float(monthly_income),
        "buckets": [
            get_category_node(root, date_criteria, db, float(monthly_income)) 
            for root in roots
        ]
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

    return {
        "avg_monthly_expense": avg_monthly_expense,
        "total_emergency_cash": total_emergency_cash,
        "runway_months": runway_months,
        "target_fund": target_fund,
        "progress_percent": min((total_emergency_cash / target_fund) * 100, 100) if target_fund > 0 else 0,
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
def get_dynamic_insights(db: Session = Depends(get_db)):
    today = date.today()
    start_of_month = today.replace(day=1)
    
    # 1. Calculate Daily Velocity
    days_passed = today.day
    expenses_this_month = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.type == models.TransactionType.EXPENSE,
        models.Transaction.date >= start_of_month
    ).scalar() or 0
    daily_burn = float(expenses_this_month) / days_passed

    # 2. Identify the "Leak" (Top Expense Category)
    top_leak = db.query(
        models.Category.name, 
        func.sum(models.Transaction.amount).label('total')
    ).join(models.Transaction).filter(
        models.Transaction.type == models.TransactionType.EXPENSE,
        models.Transaction.date >= start_of_month
    ).group_by(models.Category.name).order_by(text('total DESC')).first()

    # 3. Investment Consistency
    investment_total = db.query(func.sum(models.Transaction.amount)).join(models.Category).filter(
        models.Category.name.ilike("%Investment%"), # Or use your root category ID
        models.Transaction.date >= start_of_month
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