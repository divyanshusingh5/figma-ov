from langgraph import LangGraph, Node, Edge
import requests
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)

# Configuration
API_KEY = "<generate_it_from_settings>"
API_URL = "https://aide-sdlc-backend.imagine.tech/api/v1/brownfield"

# Define a function to call the API
def call_api(messages):
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    }
    data = {
        'model': 'aide',
        'messages': messages,
        'temperature': 0.5
    }
    
    response = requests.post(API_URL, headers=headers, json=data)
    response.raise_for_status()
    return response.json()

# Create the LangGraph
graph = LangGraph()

# Nodes for processing
component_node = Node("Identify Components", 
                       lambda query: call_api([{"role": "user", "content": f"Identify possible components for a website based on: {query}"}]))

description_node = Node("Generate Description", 
                        lambda component: call_api([{"role": "user", "content": f"Generate a detailed description for the website component: {component}"}]))

code_node = Node("Generate Code", 
                 lambda description: call_api([{"role": "user", "content": f"Generate HTML and CSS code for: {description}"}]))

# Edges connecting nodes
graph.add_edge(Edge(component_node, description_node, lambda output: output['choices'][0]['message']['content']))
graph.add_edge(Edge(description_node, code_node, lambda output: output['choices'][0]['message']['content']))

# Function to process user query
def process_query(user_query):
    logging.info("Processing user query...")
    components = component_node.run(user_query)
    
    if components:
        component_list = [comp.strip() for comp in components['choices'][0]['message']['content'].split(",")]
        html_css_code = {}

        for component in component_list:
            description = description_node.run(component)
            if description:
                code = code_node.run(description['choices'][0]['message']['content'])
                if code:
                    html_css_code[component] = code['choices'][0]['message']['content']
        
        return html_css_code
    return {}

# Example usage
if __name__ == "__main__":
    user_query = input("Enter your website query: ")
    generated_code = process_query(user_query)
    
    # Print the generated code
    if generated_code:
        print("\nGenerated HTML/CSS Code:")
        for component, code in generated_code.items():
            print(f"\nComponent: {component}\nCode:\n{code}\n")
    else:
        print("No code generated.")
