import { Icons } from '@/components/icons';

interface Link {
  url: string;
  icon: typeof Icons.github | typeof Icons.linkedin | typeof Icons.x;
}

interface Contact {
  email: string;
  social: Record<string, Link>;
}

interface DataI {
  name: string;
  initials: string;
  url: string;
  location: string;
  locationLink: string;
  description: string;
  summary: string;
  avatarUrl: string;
  skills: string[];
  contact: Contact;
}

export const DATA: DataI = {
  name: 'Dipak Parmar',
  initials: 'DP',
  url: 'https://dipak.tech',
  location: 'British Columbia, Canada',
  locationLink: 'https://www.google.com/maps/place/British+Columbia,+Canada',
  description:
    'DevSecOps Engineer with 4+ years of experience in Cloud Automation, Kubernetes, and Monitoring.',
  summary:
    'DevSecOps Engineer with **4+ years** of experience in **AWS**, **Docker**, and **Kubernetes**. Proven expertise in _automating release processes_ and implementing efficient CI/CD pipelines. Skilled in **scripting** and **cloud infrastructure optimization**. Currently working at **Clariti Software** and previously held roles at Adroit Technologies, including DevOps Architect and Engineer. In my free time, I contribute to open-source projects, demonstrating a commitment to continuous learning and community involvement.',
    avatarUrl: 'https://avatars.githubusercontent.com/u/24366206?v=4',
  skills: ['AWS', 'Terraform', 'Kubernetes', 'Docker', 'Node.js', 'Python'],
  contact: {
    email: 'hello@dipak.tech',
    social: {
      GitHub: {
        url: 'https://dipak.to/github',
        icon: Icons.github
      },
      LinkedIn: {
        url: 'https://dipak.to/linkedin',
        icon: Icons.linkedin
      },
      X: {
        url: 'https://dipak.to/x',
        icon: Icons.x
      }
    }
  }
} as const;
