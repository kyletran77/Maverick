Skip to content


Think

Artificial intelligence
Cloud
X-Force
News
Videos
Reports
Podcasts
Events
More

Subscribe
What is LangGraph?
Authors
 Bryan
Bryan Clark
Senior Technology Advocate

What is LangGraph?
LangGraph, created by LangChain, is an open source AI agent framework designed to build, deploy and manage complex generative AI agent workflows. It provides a set of tools and libraries that enable users to create, run and optimize large language models (LLMs) in a scalable and efficient manner. At its core, LangGraph uses the power of graph-based architectures to model and manage the intricate relationships between various components of an AI agent workflow.

What does all this information mean? The following example can offer a clearer understanding of LangGraph: Think about these graph-based architectures as a powerful configurable map, a “Super-Map.” Users can envision the AI workflow as being “The Navigator” of this “Super-Map.” Finally, in this example, the user is “The Cartographer.” In this sense, the navigator charts out the optimal routes between points on the “Super-Map,” all of which are created by “The Cartographer.”

To recap, optimal routes within the graph-based architectures (“Super-Map”) are charted and explored by using the AI workflow (“The Navigator”). This analogy is a great place to start understanding LangGraph—and if you like maps then you are welcome for the bonus opportunity to see someone use the word cartographer.

LangGraph workflow
LangGraph workflow

LangGraph illuminates the processes within an AI workflow, allowing full transparency of the agent’s state. Within LangGraph, the “state” feature serves as a memory bank that records and tracks all the valuable information processed by the AI system. It’s similar to a digital notebook where the system captures and updates data as it moves through various stages of a workflow or graph analysis.

For example, if you were running agents to monitor the weather, this feature could track the number of times it snowed and make suggestions based on changing snowfall trends. This observability of how the system works to complete complex tasks is useful for beginners to understand more about state management. State management is helpful when it comes to debugging as it allows the application’s state to be centralized, thus often shortening the overall process.

This approach allows for more effective decision-making, improved scalability and enhanced overall performance. It also allows for more engagement with individuals who might be new to these processes or prefer a clearer picture of what is going on behind the scenes.

LangGraph is also built on several key technologies, including LangChain, a Python framework for building AI applications. LangChain includes a library for building and managing LLMs. LangGraph also uses the human-in-the-loop approach. By combining these technologies with a set of APIs and tools, LangGraph provides users with a versatile platform for developing AI solutions and workflows including chatbots, state graphs and other agent-based systems.

Delve deeper into the world of LangGraph by exploring its key features, benefits and use cases. By the end of this article, you will have the knowledge and resources to take the next steps with LangGraph.

Key components of LangGraph
Let’s begin by first understanding the key components that make up LangGraph. The framework is built around several key components that work together to enable users to create and manage complex AI workflows. These components include:

Monitoring mechanism
Human-in-the-loop: Human-in-the-loop (HITL) refers to the requirement of human interaction at some point in the process. In the realm of machine learning (ML), HITL refers to a collaborative process where humans augment the computational capabilities of machines to make informed decisions while building a model. By using the most critical data points, HITL enhances the accuracy of machine learning algorithms, surpassing random sampling methods.

Graph architecture
Stateful graphs: A concept where each node in the graph represents a step in the computation, essentially devising a state graph. This stateful approach allows the graph to retain information about the previous steps, enabling continuous and contextual processing of information as the computation unfolds. Users can manage all LangGraph’s stateful graphs with its APIs.

Cyclical graph: A cyclical graph is any graph that contains at least one cycle and is essential for agent runtimes. This means that there exists a path that starts and ends at the same node, forming a loop within the graph. Complex workflows often involve cyclic dependencies, where the outcome of one step depends on previous steps in the loop.

Nodes: In LangGraph, nodes represent individual components or agents within an AI workflow. Nodes can be thought of as “actors” that interact with each other in a specific way. For example, to add nodes for tool calling, one can use the ToolNode. Another example, the next node, refers to the node that will be executed following the current one.

Edges: Edges are a function within Python that determines which node to execute next based on the current state. Edges can be conditional branches or fixed transitions.

Tools
RAG: Retrieval-augmented generation (RAG) combines the power of LLMs with contextual information from external sources by retrieving relevant documents, which are then used as input for answer generation.

Workflows: Workflows are the sequences of node interactions that define an AI workflow. By arranging nodes into a workflow, users can create more complex and dynamic workflows that use the strengths of individual components.

APIs: LangGraph provides a set of APIs that enable users to interact with its components in a programmatic way. Users can use an API key, add new nodes, modify existing workflows and retrieve data from an AI workflow.

LangSmith: LangSmith is a specialized API for building and managing LLMs within LangGraph. It provides tools for initializing LLMs, adding conditional edges and optimizing performance. By combining these components in innovative ways, users can build more sophisticated AI workflows that use the strengths of individual components.

Industry newsletter

The latest tech news, backed by expert insights
Stay up to date on the most important—and intriguing—industry trends on AI, automation, data and beyond with the Think newsletter. See the IBM Privacy Statement.

Business email
johndoe@yourdomain.com
Subscribe

How LangGraph scales
By using a graph-based architecture, LangGraph enables users to scale artificial intelligence workflows without slowing down or sacrificing efficiency. LangGraph uses enhanced decision-making by modeling complex relationships between nodes, which means it uses AI agents to analyze their past actions and feedback. In the world of LLMs, this process is referred to as reflection.

Enhanced decision-making: By modeling complex relationships between nodes, LangGraph provides a framework for building more effective decision-making systems.

Increased flexibility: An open source nature and modular design for developers to integrate new components and adapt existing workflows.

Multiagent workflows: Complex tasks can be tackled through multiagent workflows. This approach involves creating dedicated LangChain agents for specific tasks or domains. Routing tasks to the appropriate LangChain agents allows for parallel execution and efficient handling of diverse workloads. Such a multiagent network architecture exemplifies the decentralized coordination of agent automation.

A great example, created by Joao Moura, is using CrewAI with LangChain and LangGraph. Checking emails and creating drafts is automated with CrewAI orchestrating autonomous AI agents, enabling them to collaborate and run complex tasks efficiently.

AI agents

IN 5 Types of AI Agents: Autonomous Functions & Real-World Applications
5 Types of AI Agents: Autonomous Functions & Real-World Applications
Learn how goal-driven and utility-based AI adapt to workflows and complex environments.

Build, deploy and monitor AI agents 
LangGraph use cases
Chatbots: Users can build an agentic application for vacation planning, with node-based workflows and directed acyclic graphs (DAGs). The chatbot learns to respond to minimal user input and tailor recommendations. Currently, services such as Google’s Duplex are using LangGraph in a similar fashion to mimic human-like conversations.

Agent systems: LangGraph provides a framework for building agent-based systems, which can be used in applications such as robotics, autonomous vehicles or video games.

LLM applications: By using LangGraph’s capabilities, developers can build more sophisticated AI models that learn and improve over time. Norwegian Cruise Line uses LangGraph to compile, construct and refine guest-facing AI solutions. This capability allows for improved and personalized guest experiences.

LLM integration in LangGraph
LangGraph’s agents are based on OpenAI’s series of GPT (generative pretrained transformer) models GPT-3.5 and GPT-4. However, LangGraph and its open source community have contributed to the addition of several other models that initialize through LLM API configuration, including Anthropic and AzureChatOpenAI models. The relatively small loop is similar to projects such as Auto-GPT.

LangGraph offers a YouTube tutorial that facilitates the exploration of how to integrate with open source LLMs on its GitHub docs site. The first step to integrating an LLM is to set up an inference repository (repo) such as LLaMA-Factory, FastChat and Ollama. This repository enables deployment of the corresponding LLM model that is configured through its API credentials.

Other AI agent frameworks
CrewAI, MetaGPT and AutoGen are just a few multiagent frameworks that can handle complex workflows. This operation allows for a more flexible and nuanced approach to tackling diverse computational challenges. By providing comprehensive debugging capabilities, these frameworks enable developers to quickly identify and resolve issues, leading to more efficient development and optimization processes.

LangGraph Studio: A visual interface for workflow development
LangGraph has also introduced LangGraph Studio, a visual interface for workflow development. With LangGraph Studio, users can design and build workflows by using a graphical interface, without having to write code. The downloadable desktop application makes LangGraph Studio more usable for beginners. LangGraph Studio has also made these additional features available:

Shallow learning curve: LangGraph Studio is not needed to access LangGraph. However, by using LangGraph Studio’s visual interface, users can focus on designing their workflows without getting bogged down in code.

Improved collaboration: LangGraph Studio enables the sharing of workflows with others, whether that’s a team of developers or a client.

Debugging: The capabilities do not end with building a graph, debugging features are included to ensure the graph is accurate and reliable. LangGraph Studio, with its cutting-edge integrated development environment (IDE), helps visualize and debug LangGraph applications.

Future developments
Enhanced natural language processing (NLP): LangGraph will have more advanced NLP capabilities, allowing it to better understand natural language and provide more accurate responses.

Improved machine learning: LangGraph will have improved machine learning capabilities, allowing it to learn and improve over time.

Support for new platforms: LangGraph will support new platforms, such as mobile devices and edge computing to make its technology more accessible.

Report
Top strategic technology trends for 2025: Agentic AI
Download this Gartner® research report to learn the potential opportunities and risks of agentic AI for IT leaders and how to prepare for this next wave of AI innovation.

Read the report
Resources
Carousel
IBM Developer
Agents: watsonx Developer Hub
Get started with building and deploying agents by using watsonx.ai.

Explore the Developer Hub
Report
Omdia Report on empowered intelligence: The impact of AI agents
Discover how you can unlock the full potential of gen AI with AI agents.

Read the report







1 / 4
Slide 1 of 4. Showing 2 items.
Related solutions
AI agents for business
Build, deploy and manage powerful AI assistants and agents that automate workflows and processes with generative AI.

Explore watsonx Orchestrate 
IBM AI agent solutions
Build the future of your business with AI solutions that you can trust.

Explore AI agent solutions 
IBM Consulting AI services
IBM Consulting AI services help reimagine how businesses work with AI for transformation.

Explore artificial intelligence services 
Take the next step
Automate your complex workflows and create breakthrough productivity with one of the industry's most comprehensive set of capabilities for helping businesses build, customize and manage AI agents and assistants. 

Explore watsonx.ai agent development
Discover watsonx Orchestrate
Discover
Products
Consulting services
Industries
Case studies
Financing
Research
 
Follow
LinkedIn
X
Instagram
YouTube
Podcasts
 
Connect
Business partners
Documentation
Events
Subscription center
Support
TechXchange community
 
About
Overview
Careers
Investor relations
Leadership
Newsroom
Security, privacy and trust
 
Contact IBM
Privacy
Terms of use
Accessibility
Cookie preferences and do not sell or share my personal information



Your privacy choices


Hello! How can we help you?


Close
The chat window has been closed