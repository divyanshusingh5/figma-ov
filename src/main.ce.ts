import os
import logging
from langgraph import LangGraph, Agent, Tool
from openai import OpenAI

# Configure logging
logging.basicConfig(level=logging.INFO)

# Load environment variables for configuration
API_KEY = os.getenv("AIDE_API_KEY", "<default_api_key>")
BASE_URL = os.getenv("AIDE_BASE_URL", "https://aide-sdlc-backend.imagine.tech/api/v1/brownfield")

# Function to call the Llama model
def llama(messages, temperature=0.5, max_tokens=150):
    openai_client = OpenAI(base_url=BASE_URL, api_key=API_KEY)
    try:
        completion = openai_client.chat.completions.create(
            model="meta-llama/meta-Llama3.1-8B-Instruct",
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        return completion.choices[0].message.content
    except Exception as e:
        logging.error(f"API call error: {e}")
        return f"Error generating response: {str(e)}"

# Chat message formatting function
def chat(role, message):
    return {"role": role, "content": message}

# Tool for generating components, descriptions, and code
class LlamaTool(Tool):
    def __init__(self, role):
        self.role = role

    def execute(self, messages):
        return llama(messages)

# Define agents
class ComponentGenerator(Agent):
    def __init__(self):
        self.tool = LlamaTool(role="component_generator")

    def run(self, user_query):
        messages = [
            chat("system", "You are a component generator."),
            chat("user", user_query)
        ]
        return self.tool.execute(messages)

class DescriptionGenerator(Agent):
    def __init__(self):
        self.tool = LlamaTool(role="description_generator")

    def run(self, components):
        messages = [
            chat("system", "You are a description generator."),
            chat("user", f"Provide detailed descriptions for the following components: {components}")
        ]
        return self.tool.execute(messages)

class CodeGenerator(Agent):
    def __init__(self):
        self.tool = LlamaTool(role="code_generator")

    def run(self, components):
        messages = [
            chat("system", "You are a code generator."),
            chat("user", f"Generate HTML/CSS code for the following components: {components}")
        ]
        return self.tool.execute(messages)

# Define the agentic workflow
def agentic_workflow(user_query):
    if not user_query.strip():
        return "Error: User query cannot be empty."

    graph = LangGraph()

    # Create agents
    component_agent = graph.add_agent(ComponentGenerator())
    description_agent = graph.add_agent(DescriptionGenerator())
    code_agent = graph.add_agent(CodeGenerator())

    # Define workflow edges
    graph.add_edge(component_agent, description_agent)
    graph.add_edge(description_agent, code_agent)

    # Execute the workflow
    components = component_agent.run(user_query)
    if "Error" in components:
        return components

    descriptions = description_agent.run(components)
    if "Error" in descriptions:
        return descriptions

    code = code_agent.run(components)
    if "Error" in code:
        return code

    return {
        "components": components,
        "descriptions": descriptions,
        "code": code
    }

if __name__ == "__main__":
    user_query = input("Enter your website component query: ")
    result = agentic_workflow(user_query)

    if isinstance(result, dict):
        print("Components:", result["components"])
        print("Descriptions:", result["descriptions"])
        print("Code:", result["code"])
    else:
        print("Error:", result)
