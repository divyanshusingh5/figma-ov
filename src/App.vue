from typing import Literal
from langchain_core.messages import HumanMessage
from langchain_core.tools import tool
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph, MessagesState
from langgraph.prebuilt import ToolNode
import requests
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)

# Configuration
API_KEY = "<generate_it_from_settings>"  # Replace with your API key
API_URL = "https://aide-sdlc-backend.imagine.tech/api/v1/brownfield"

# Define a function to call the custom LLM
def call_custom_llm(messages):
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    }
    data = {
        'model': 'meta-llama/meta-Lama3.1-8B Instruct',  # Specify your model here
        'messages': messages,
        'temperature': 0.5
    }
    
    response = requests.post(API_URL, headers=headers, json=data)
    response.raise_for_status()  # Raise an error for bad responses
    return response.json()['choices'][0]['message']['content']

# Define the tools for the agent to use
@tool
def search(query: str):
    """Placeholder function simulating a web search."""
    if "sf" in query.lower() or "san francisco" in query.lower():
        return "It's 60 degrees and foggy."
    return "It's 90 degrees and sunny."

tools = [search]
tool_node = ToolNode(tools)

# Function to determine if we should continue or not
def should_continue(state: MessagesState) -> Literal["tools", END]:
    messages = state['messages']
    last_message = messages[-1]
    # If the last message includes tool calls, route to the "tools" node
    if last_message.tool_calls:
        return "tools"
    return END  # Stop and reply to the user

# Function to call the custom LLM
def call_model(state: MessagesState):
    messages = state['messages']
    response = call_custom_llm(messages)
    return {"messages": [HumanMessage(content=response)]}

# Create the workflow graph
workflow = StateGraph(MessagesState)

# Define the nodes for the graph
workflow.add_node("agent", call_model)
workflow.add_node("tools", tool_node)

# Set the starting point of the graph
workflow.add_edge(START, "agent")

# Add conditional edges to handle workflow
workflow.add_conditional_edges(
    "agent",
    should_continue,
)

# Add an edge from "tools" back to "agent"
workflow.add_edge("tools", 'agent')

# Initialize memory for state persistence
checkpointer = MemorySaver()

# Compile the graph into a Runnable
app = workflow.compile(checkpointer=checkpointer)

# Example usage
if __name__ == "__main__":
    user_query = input("Enter your query: ")
    final_state = app.invoke(
        {"messages": [HumanMessage(content=user_query)]},
        config={"configurable": {"thread_id": 42}}
    )
    print(final_state["messages"][-1].content)
