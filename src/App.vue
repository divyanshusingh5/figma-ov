import requests
import logging
from langchain_core.messages import HumanMessage
from langchain_core.tools import tool
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph, MessagesState
from langgraph.prebuilt import ToolNode

# Configure logging
logging.basicConfig(level=logging.INFO)

# Configuration
API_KEY = "<generate_it_from_settings>"  # Replace with your API key
API_URL = "https://aide-sdlc-backend.imagine.tech/api/v1/brownfield"

# Function to call the custom LLM
def call_custom_llm(messages):
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    }
    data = {
        'model': 'aide',  # Specify your model here
        'messages': messages,
        'temperature': 0.5
    }
    
    response = requests.post(API_URL, headers=headers, json=data)
    response.raise_for_status()  # Raise an error for bad responses
    return response.json()['choices'][0]['message']['content']

# Node to identify components
@tool
def identify_components(query: str):
    return call_custom_llm([{"role": "user", "content": f"Identify possible components for a website based on: {query}"}])

# Node to generate descriptions
@tool
def generate_description(component: str):
    return call_custom_llm([{"role": "user", "content": f"Generate a detailed description for the website component: {component}"}])

# Node to generate HTML/CSS code
@tool
def generate_code(description: str):
    return call_custom_llm([{"role": "user", "content": f"Generate HTML and CSS code for: {description}"}])

# Define the workflow
workflow = StateGraph(MessagesState)

# Add nodes to the workflow
workflow.add_node("identify_components", identify_components)
workflow.add_node("generate_description", generate_description)
workflow.add_node("generate_code", generate_code)

# Define the entry point
workflow.add_edge(START, "identify_components")
workflow.add_edge("identify_components", "generate_description")
workflow.add_edge("generate_description", "generate_code")

# Initialize memory to persist state
checkpointer = MemorySaver()

# Compile the graph into a Runnable
app = workflow.compile(checkpointer=checkpointer)

# Example usage
if __name__ == "__main__":
    user_query = input("Enter your website query: ")
    final_state = app.invoke({"messages": [HumanMessage(content=user_query)]})
    
    # Print results directly
    for message in final_state["messages"]:
        print(message.content)
