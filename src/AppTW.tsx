import MarkdownRenderer from './components/markdown/MarkdownRenderer'

const landingPageMarkdown = `# Welcome to Our Platform

## Revolutionizing the way you work

Transform your workflow with our cutting-edge solution designed for modern teams.

---

### ✨ Key Features

- **Lightning Fast** - Optimized for speed and performance
- **Secure by Design** - Enterprise-grade security built-in
- **Seamless Integration** - Works with your existing tools
- **24/7 Support** - We're here when you need us

### 🚀 Getting Started

Getting up and running takes less than 5 minutes:

1. **Sign up** for your free account
2. **Connect** your existing tools
3. **Import** your data
4. **Start** being more productive

### 💼 Trusted by Industry Leaders

> "This platform has transformed how our team collaborates. We've seen a 40% increase in productivity since switching."
>
> **— Sarah Chen, CTO at TechCorp**

### 📊 See the Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Task Completion | 65% | 89% | +37% |
| Team Satisfaction | 3.2/5 | 4.7/5 | +47% |
| Response Time | 2.4h | 0.8h | -67% |

### 🛠️ Developer Friendly

Built with developers in mind:

\`\`\`javascript
// Simple API integration
import { Platform } from '@platform/sdk'

const client = new Platform({
  apiKey: 'your-api-key'
})

// Get started in seconds
const result = await client.tasks.create({
  title: 'Welcome to the platform!',
  assignee: 'team@company.com'
})
\`\`\`

### 🌟 Ready to Get Started?

Join thousands of teams already using our platform to achieve more.

**[Start Free Trial](https://example.com/signup)** · **[View Pricing](https://example.com/pricing)** · **[Contact Sales](https://example.com/contact)**

---

*Built with ❤️ for teams that ship fast*`

function App() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-4xl mx-auto p-8">
            <MarkdownRenderer>{landingPageMarkdown}</MarkdownRenderer>
            </div>
        </div>
    )
}

export default App
