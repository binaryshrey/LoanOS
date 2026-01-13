from vertexai.generative_models import GenerativeModel
import vertexai
import os

PROJECT_ID = "striking-talent-484205-u8"
REGION = "us-central1"

vertexai.init(project=PROJECT_ID, location=REGION)

model = GenerativeModel("gemini-2.5-flash")

def analyze_loan(input_text: str) -> str:
    response = model.generate_content(
        f"""
        You are a loan underwriting AI.
        Analyze the following loan application and return:
        - Risk summary
        - Approval recommendation
        - Key red flags

        Loan application:
        {input_text}
        """
    )

    return response.text
