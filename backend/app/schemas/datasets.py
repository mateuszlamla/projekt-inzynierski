from pydantic import BaseModel


class AddStepRequest(BaseModel):
    file_id: str
    step_type: str  # drop_nulls, fill_null, drop_duplicates, filter, cast
    params: dict
