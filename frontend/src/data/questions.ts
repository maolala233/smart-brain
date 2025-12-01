export const questions = [
    {
        id: 1,
        text: "When analyzing a new project requirement, what is your first step?",
        options: [
            { text: "Break it down into technical components and dependencies", score: 5 },
            { text: "Research existing solutions and best practices", score: 4 },
            { text: "Clarify the business value and user needs", score: 3 },
            { text: "Start coding a prototype immediately", score: 1 },
        ],
    },
    {
        id: 2,
        text: "How do you handle a critical bug in production?",
        options: [
            { text: "Analyze logs, reproduce locally, then fix", score: 5 },
            { text: "Rollback immediately, then investigate", score: 4 },
            { text: "Apply a quick patch and monitor", score: 3 },
            { text: "Panic and ask for help", score: 1 },
        ],
    },
    {
        id: 3,
        text: "When explaining a technical concept to a non-technical stakeholder, you:",
        options: [
            { text: "Use analogies and focus on business impact", score: 5 },
            { text: "Simplify the technical terms but keep the logic", score: 4 },
            { text: "Use precise technical terminology to be accurate", score: 2 },
            { text: "Tell them it's too complicated to explain", score: 1 },
        ],
    },
    {
        id: 4,
        text: "You disagree with a team member's architectural decision. You:",
        options: [
            { text: "Propose an alternative with pros/cons analysis", score: 5 },
            { text: "Discuss it in a code review or meeting", score: 4 },
            { text: "Let it go to avoid conflict", score: 2 },
            { text: "Complain to the manager", score: 1 },
        ],
    },
    {
        id: 5,
        text: "How do you approach learning a new technology?",
        options: [
            { text: "Build a small project to understand core concepts", score: 5 },
            { text: "Read the official documentation thoroughly", score: 4 },
            { text: "Watch tutorials and copy code", score: 3 },
            { text: "Wait until I'm forced to use it", score: 1 },
        ],
    },
];
