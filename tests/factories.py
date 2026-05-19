import factory
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.goal import Goal
from app.models.enums import GoalStatus, GoalPriority, UoMType
from app.core.security import get_password_hash
import uuid

class DepartmentFactory(factory.Factory):
    class Meta:
        model = dict
    
    name = factory.Faker("company")
    description = factory.Faker("catch_phrase")

class UserFactory(factory.Factory):
    class Meta:
        model = dict

    email = factory.Faker("email")
    full_name = factory.Faker("name")
    password = "testpassword"
    role = UserRole.employee
    is_active = True
    is_superuser = False

class GoalFactory(factory.Factory):
    class Meta:
        model = dict

    title = factory.Faker("sentence", nb_words=4)
    description = factory.Faker("paragraph")
    thrust_area = "Growth"
    uom = UoMType.numeric_max
    priority = GoalPriority.medium
    weightage = 20
    target_value = 100.0
    current_value = 0.0
    quarter = "2024-Q1"
    status = GoalStatus.draft
    is_locked = False

async def create_department(db, **kwargs) -> Department:
    dept_data = DepartmentFactory(**kwargs)
    dept = Department(**dept_data)
    db.add(dept)
    await db.commit()
    await db.refresh(dept)
    return dept

async def create_user(db, **kwargs) -> User:
    user_data = UserFactory(**kwargs)
    password = user_data.pop("password")
    user_data["hashed_password"] = get_password_hash(password)
    
    user = User(**user_data)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

async def create_goal(db, owner_id: uuid.UUID, **kwargs) -> Goal:
    goal_data = GoalFactory(**kwargs)
    goal = Goal(**goal_data, owner_id=owner_id)
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal
