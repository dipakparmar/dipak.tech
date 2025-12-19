'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import React, { useState } from 'react';

import { ArrowTopRightIcon } from '@radix-ui/react-icons';
import Image from 'next/image';
import Link from 'next/link';
import Markdown from 'react-markdown';
import { Slider } from '@/components/ui/slider';

enum DetailLevel {
  SUMMARY = 0,
  MINIMAL = 1,
  DETAILED = 2,
  VERY_DETAILED = 3
}

export function Portfolio() {
  const [detailLevel, setDetailLevel] = useState<DetailLevel>(
    DetailLevel.DETAILED
  );

  const handleSliderChange = (value: number[]) => {
    setDetailLevel(value[0] as DetailLevel);
  };

  const getFilteredData = <T extends ItemProps>(
    data: T[],
    level: DetailLevel
  ): T[] => {
    return data.map((item) => {
      let description = item.description ? item.description.split('\n') : [];

      switch (level) {
        case DetailLevel.SUMMARY:
          return { ...item, description: description.slice(0, 1).join('\n') };
        case DetailLevel.MINIMAL:
          return { ...item, description: description.slice(0, 2).join('\n') };
        case DetailLevel.DETAILED:
          return { ...item, description: description.slice(0, 4).join('\n') };
        case DetailLevel.VERY_DETAILED:
        default:
          return item;
      }
    });
  };

  const filteredWorkExperience = getFilteredData(
    workExperienceData,
    detailLevel
  );
  const filteredProjects = getFilteredData(projectData, detailLevel);
  const filteredAwards = getFilteredData(awardsData, detailLevel);
  const filteredEducation = getFilteredData(educationData, detailLevel);

  return (
    <div className="min-h-screen text-muted-foreground font-light px-4 md:px-0">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="py-4">
          <h2 className="text-lg font-normal text-foreground mb-2">
            Resume Detail Level
          </h2>
          <Slider
            defaultValue={[DetailLevel.DETAILED]}
            max={3}
            step={1}
            onValueChange={handleSliderChange}
            className="w-full"
          />
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>Summary</span>
            <span>Minimal</span>
            <span>Detailed</span>
            <span>Very Detailed</span>
          </div>
        </div>

        <header className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
          <Avatar className="w-20 h-20 border">
            <AvatarImage
              src={personalData.avatarImage}
              alt={personalData.name}
            />
            <AvatarFallback className="bg-muted-foreground text-background">
              {' '}
              {personalData.name
                .split(' ')
                .map((n) => n.charAt(0))
                .join('')}{' '}
            </AvatarFallback>
          </Avatar>
          <div className="text-center md:text-left">
            <h1 className="text-xl font-normal text-foreground dark:text-white">
              {personalData.name}
            </h1>
            <div className="text-sm text-muted-foreground">
              <Markdown>{`${personalData.title} in ${personalData.location}`}</Markdown>
            </div>
            <Link href={personalData.website}>
              <p className="text-xs text-muted-foreground bg-muted rounded-full inline-block px-2 py-0.5 backdrop-blur-sm backdrop-filter">
                {personalData.website.replace(/(^\w+:|^)\/\//, '')}
              </p>
            </Link>
          </div>
        </header>

        <section>
          <h2 className="text-lg font-normal text-foreground mb-2">About</h2>
          <div className="text-sm text-muted-foreground">
            <Markdown>{personalData.about}</Markdown>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-normal text-foreground mb-4">
            Work Experience
          </h2>
          <div className="space-y-6">
            {filteredWorkExperience.map((item, idx) => (
              <Item key={idx} {...item} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-normal text-foreground mb-4">
            Side Projects
          </h2>
          <div className="space-y-6">
            {filteredProjects.map((item, idx) => (
              <Item key={idx} {...item} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-normal text-foreground mb-4">Awards</h2>
          <div className="space-y-6">
            {filteredAwards.map((item, idx) => (
              <Item key={idx} {...item} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-normal text-foreground mb-4">
            Education
          </h2>
          <div className="space-y-6">
            {filteredEducation.map((item, idx) => (
              <Item key={idx} {...item} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-normal text-foreground mb-4">Contact</h2>
          <div className="space-y-2">
            {contactData.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-2 md:gap-4"
              >
                <div className="text-sm text-muted-foreground rounded col-span-full md:col-span-1 text-left md:text-left md:p-1">
                  {item.name}
                </div>
                <div className="col-span-full md:col-span-1">
                  <Link
                    href={item.link}
                    className="flex items-center space-x-1 text-sm text-foreground"
                  >
                    <span className="hover:underline hover:underline-offset-[3px] hover:decoration-[1px] transition duration-300">
                      {item.username}
                    </span>
                    <ArrowTopRightIcon className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

const Item = ({
  date,
  title,
  titlelink,
  organization,
  location,
  description,
  clients,
  images
}: ItemProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-2 md:gap-4">
      <div className="text-sm text-muted-foreground rounded col-span-full md:col-span-1 text-left md:p-1">
        <Markdown>{date}</Markdown>
      </div>
      <div className="space-y-2 col-span-full md:col-span-1">
        {titlelink ? (
          <Link
            href={titlelink}
            className="flex items-center space-x-1 text-base font-normal text-foreground dark:text-white"
          >
            <div className="hover:underline hover:underline-offset-[3px] hover:decoration-[1px] transition duration-300 inline">
              <Markdown>{`${title} ${organization ? `at ${organization}` : ''}`}</Markdown>
            </div>
            <ArrowTopRightIcon className="w-4 h-4 font-bold" />
          </Link>
        ) : (
          <div className="text-base font-normal text-foreground dark:text-white">
            <Markdown>{`${title} ${organization ? `at ${organization}` : ''}`}</Markdown>
          </div>
        )}
        {location && (
          <div className="text-sm text-muted-foreground">
            <Markdown>{location}</Markdown>
          </div>
        )}
        {description && (
          <div className="text-sm text-muted-foreground [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>ul>li]:mt-2 [&>ol>li]:mt-2">
            <Markdown>{description}</Markdown>
          </div>
        )}
        {clients && (
          <div className="text-sm text-muted-foreground">
            <Markdown>{clients}</Markdown>
          </div>
        )}
        {images && (
          <div className="flex space-x-2 mt-2 overflow-x-auto">
            {images.map((src, index) => (
              <Card
                key={index}
                className="w-24 h-16 overflow-hidden flex-shrink-0"
              >
                <CardContent className="p-0">
                  <Image
                    src={src}
                    alt={`${title} ${index + 1}`}
                    width={96}
                    height={64}
                    className="object-cover"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface PersonalData {
  name: string;
  title: string;
  location: string;
  avatarImage: string;
  website: string;
  email: string;
  phone: string;
  socials: Array<{
    name: string;
    link: string;
  }>;
  about: string;
}

interface ItemProps {
  date: string;
  title: string;
  titlelink?: string;
  organization?: string;
  location?: string;
  description?: string;
  clients?: string;
  images?: string[];
}

interface ContactItem {
  name: string;
  username: string;
  link: string;
}

const personalData: PersonalData = {
  name: 'Dipak Parmar',
  title: 'DevSecOps Engineer ⛅️',
  location: '🇨🇦',
  avatarImage: 'https://avatars.githubusercontent.com/u/24366206?v=4',
  website: 'https://dipak.tech',
  email: '',
  phone: '',
  socials: [
    { name: 'Twitter', link: 'https://twitter.com/iamdipakparmar' },
    { name: 'Instagram', link: 'https://instagram.com/iamdipakparmar' },
    { name: 'LinkedIn', link: 'https://linkedin.com/in/iamdipakparmar' }
  ],
  about: 'DevSecOps Engineer ⛅️ in 🇨🇦, he/him'
};

const workExperienceData: ItemProps[] = [
  {
    date: '2020 — 2022',
    title: 'DevOps Engineer',
    organization: 'Adroit Technologies Ltd.',
    titlelink: 'https://www.atws.ca',
    location: 'Kamloops, BC',
    description:
      '- Automated release processes for 300+ web applications and services, improving development efficiency by 20% and reducing deployment time by 33%.\n - Built and deployed Docker containers to break up monolithic apps into microservices, improving developer workflow, increasing scalability, and optimizing speed.\n - Setup and Maintained a 98% uptime of a network of 25+ servers across VMware Cloud and On-Prem Hyper-V Environment.\n - Managed, Patched and Upgraded production deployments in Kubernetes, including WordPress hosting and other SaaS apps using Rancher and Kubectl CLI and API.\n - Wrote, tested and maintained PHP, Python, Bash, JavaScript, and PowerShell scripts and tools to increase automation and efficiency, including patching management and production resources.\n - Utilized open-source projects to build in-house Transactional Email Service with spam protection/trap in-built, reducing dependence on third-party email services and delivering 65K emails monthly.'
  },
  {
    date: '2020 — 2022',
    title: 'Tier II IT Support Engineer',
    organization: 'Adroit Technologies Ltd.',
    titlelink: 'https://www.atws.ca',
    location: 'Kamloops, BC',
    description: `- Provisioned and set up M365 Tenants using best practices for medium-sized businesses to large enterprises.\n - Managed and monitored on-prem servers with active directory, exchange server and file server in Hyper-V Environment.\n - Managed, monitored and architected Cloud VOIP Solutions with 3CX and Direct Routing with Microsoft Teams.\n - Provided support for a wide range of Microsoft 365 services, including Exchange Online, SharePoint, Microsoft Teams, Azure AD, Endpoint Manager, Dynamics 365 Customer Service/Sales Enterprise/Field Service and Windows 10.\n - Resolved escalated support tickets and provided recommendations to management on how to improve the support process.\n - Wrote and updated Standard Operating Procedures (SOPs) for various IT functions.\n - Trained staff and Acted as a point of contact for other departments within the company and provided support as needed.`
  },
  {
    date: '2019 — 2021',
    title: 'Web Developer',
    organization: 'Adroit Technologies Ltd.',
    titlelink: 'https://www.atws.ca',
    location: 'Kamloops, BC',
    description: `- Designed complex WordPress solutions for back-end and front-end development to establish and guide website architecture and functionality.
- Developed custom mobile-friendly WordPress Elementor templates and themes to align with site design and branding for clients.
- Wrote and implemented custom plugins to extend the functionality of WordPress using best practices for security and performance.
- Optimized plugins, themes, and WordPress performance and caching to ensure fast, less than 4s page load times for users.
- Managed over 200+ WordPress sites for clients, providing updates, installations, and troubleshooting support, including migrations from other platforms.`
  }
];

const projectData: ItemProps[] = [
  {
    date: '2022',
    title: 'BC Transit GraphQL API',
    titlelink: 'https://transit.dipak.io/playground',
    description:
      'A GraphQL API for BC Transit bus schedules and real-time data.'
  }
];

const awardsData: ItemProps[] = [
  {
    date: '2022',
    title: 'Social Media Ambassador Leader, Winter 2021',
    organization: 'Thompson Rivers University'
  },
  {
    date: '2018',
    title: 'Privacy Champion',
    organization: 'ComExpo Cyber Security'
  },
  {
    date: '2017',
    title: 'Grand Finalist Smart India Hackathon',
    titlelink: 'https://www.sih.gov.in/',
    organization: 'Ministry of Human Resource Development, Govt. Of India'
  }
];

const educationData: ItemProps[] = [
  {
    date: '2019 — 2021',
    title: 'Computer Science Diploma',
    organization: 'Thompson Rivers University',
    location: 'Kamloops, BC'
  }
];

const contactData: ContactItem[] = [
  {
    name: 'Links',
    username: 'dipak.bio/links',
    link: 'https://dipak.bio/links'
  },
  {
    name: 'Github',
    username: 'dipakparmar',
    link: 'https://github.com/dipakparmar'
  },
  {
    name: 'LinkedIn',
    username: 'iamdipakparmar',
    link: 'https://linkedin.com/in/iamdipakparmar'
  },
  {
    name: 'Instagram',
    username: 'iamdipakparmar',
    link: 'https://instagram.com/iamdipakparmar'
  },
  {
    name: 'X',
    username: 'iamdipakparmar',
    link: 'https://x.com/iamdipakparmar'
  }
];
