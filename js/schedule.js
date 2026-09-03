/**
 * DevForge — Weekly schedule definitions
 */

export const DAY_THEMES = {
  0: { name: 'Sunday', themes: ['Weekly Review', 'Rest'] },
  1: { name: 'Monday', themes: ['C# Foundation', 'SQL', 'Tenant API'] },
  2: { name: 'Tuesday', themes: ['C# + SQL Deep Dive', 'Tenant API'] },
  3: { name: 'Wednesday', themes: ['ASP.NET Core', 'SQL', 'Tenant API'] },
  4: { name: 'Thursday', themes: ['C# Deep Dive', 'SQL Deep Dive', 'Tenant API'] },
  5: { name: 'Friday', themes: ['Integration Day', 'Testing', 'Tenant API'] },
  6: { name: 'Saturday', themes: ['Experiment Day', 'Docker / Azure / Dapper / CI/CD / Microservices'] }
};

export const WEEKLY_TASKS = {
  0: [
    {
      title: 'Weekly Review',
      category: 'Review',
      description: 'Review the week, reflect on progress, and plan ahead. Take 30–60 minutes.',
      estimated_duration: 45
    }
  ],
  1: [
    {
      title: 'C# Foundation',
      category: 'C#',
      description: 'Study core C# concepts — OOP, types, control flow, and language fundamentals.',
      estimated_duration: 60
    },
    {
      title: 'SQL Practice',
      category: 'SQL',
      description: 'Practice SQL queries — SELECT, WHERE, JOINs, and basic operations.',
      estimated_duration: 60
    },
    {
      title: 'Tenant API Development',
      category: 'Tenant API',
      description: 'Work on the Tenant Management API project — features, endpoints, and architecture.',
      estimated_duration: 120
    },
    {
      title: 'Review and Git',
      category: 'Review',
      description: 'Review today\'s work, commit changes, and update notes.',
      estimated_duration: 30
    }
  ],
  2: [
    {
      title: 'C# Practice',
      category: 'C#',
      description: 'Hands-on C# coding exercises and problem solving.',
      estimated_duration: 60
    },
    {
      title: 'SQL Deep Dive',
      category: 'SQL',
      description: 'Advanced SQL — subqueries, CTEs, window functions, and optimization.',
      estimated_duration: 90
    },
    {
      title: 'Tenant API Development',
      category: 'Tenant API',
      description: 'Continue Tenant API development — new features and refactoring.',
      estimated_duration: 120
    },
    {
      title: 'Review',
      category: 'Review',
      description: 'Review progress and update learning notes.',
      estimated_duration: 30
    }
  ],
  3: [
    {
      title: 'ASP.NET Core Study',
      category: 'ASP.NET Core',
      description: 'Learn ASP.NET Core — middleware, DI, routing, and Web API patterns.',
      estimated_duration: 75
    },
    {
      title: 'SQL Practice',
      category: 'SQL',
      description: 'SQL practice with real-world query scenarios.',
      estimated_duration: 60
    },
    {
      title: 'Tenant API Development',
      category: 'Tenant API',
      description: 'Apply ASP.NET Core patterns to the Tenant API.',
      estimated_duration: 120
    },
    {
      title: 'Git and Review',
      category: 'Review',
      description: 'Commit work, review notes, and plan tomorrow.',
      estimated_duration: 30
    }
  ],
  4: [
    {
      title: 'C# Deep Dive',
      category: 'C#',
      description: 'Advanced C# — generics, LINQ, async/await, patterns, and best practices.',
      estimated_duration: 90
    },
    {
      title: 'SQL Deep Dive',
      category: 'SQL',
      description: 'Database engineering — indexes, execution plans, transactions.',
      estimated_duration: 90
    },
    {
      title: 'Tenant API Development',
      category: 'Tenant API',
      description: 'Deep work on Tenant API — complex features and integration.',
      estimated_duration: 120
    },
    {
      title: 'Review',
      category: 'Review',
      description: 'End-of-day review and note-taking.',
      estimated_duration: 30
    }
  ],
  5: [
    {
      title: 'C# Review',
      category: 'C#',
      description: 'Review C# topics covered this week.',
      estimated_duration: 60
    },
    {
      title: 'SQL Review',
      category: 'SQL',
      description: 'Review SQL topics and practice weak areas.',
      estimated_duration: 60
    },
    {
      title: 'Tenant API Integration',
      category: 'Tenant API',
      description: 'Integration work — connect components, test flows end-to-end.',
      estimated_duration: 180
    },
    {
      title: 'Testing and Git',
      category: 'Testing',
      description: 'Write tests, run test suites, commit and push changes.',
      estimated_duration: 60
    }
  ],
  6: [
    {
      title: 'Experiment Day',
      category: 'DevOps',
      description: 'Explore new technologies: Docker, Dapper, CI/CD, Azure, Caching, Background Services, or Microservices.',
      estimated_duration: 180
    }
  ]
};

export function getDayFocus(dayOfWeek) {
  const focuses = {
    0: { csharp: 'Rest day', sql: 'Rest day', tenant: 'Rest day' },
    1: { csharp: 'Foundation — OOP, types, control flow', sql: 'Basic queries — SELECT, WHERE, ORDER BY', tenant: 'Core endpoints and project structure' },
    2: { csharp: 'Practice exercises and problem solving', sql: 'Deep dive — subqueries, CTEs, joins', tenant: 'Feature development and refactoring' },
    3: { csharp: 'ASP.NET Core patterns', sql: 'Real-world query scenarios', tenant: 'Apply middleware and DI patterns' },
    4: { csharp: 'Generics, LINQ, async/await', sql: 'Indexes, execution plans, transactions', tenant: 'Complex features and integration' },
    5: { csharp: 'Weekly C# review', sql: 'Weekly SQL review', tenant: 'Integration and end-to-end testing' },
    6: { csharp: 'Experiment with new tools', sql: 'Experiment with Dapper or EF', tenant: 'Explore deployment and infrastructure' }
  };
  return focuses[dayOfWeek] || focuses[1];
}

export function getScheduleForDay(dayOfWeek) {
  return WEEKLY_TASKS[dayOfWeek] || [];
}

export function getDayThemes(dayOfWeek) {
  return DAY_THEMES[dayOfWeek] || DAY_THEMES[1];
}
