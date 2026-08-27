import type { JobResult } from "./readDrawer";

export const postJob = async (url: string, extracted: JobResult) => {
  const payload: Record<string, unknown> = {
    createdBy: "hiringcafe",
    title: extracted.title,
    company: {
      name: extracted.company,
      logo: extracted.logo,
      tags: extracted.companyTags ?? [],
    },
    description: extracted.description,
    applyLink: extracted.apply_url,
    companyLink: extracted.companyLink ?? "",
    postedAgo: extracted.postedAgo,
    tags: extracted.tags ?? [],
    skills: extracted.skills ?? [],
    details: {
      location: extracted.location,
      employmentType: extracted.employmentType ?? "",
      workplaceType: extracted.workplaceType,
      salary: extracted.salary,
    },
    applicants: {
      count: extracted.applicantsCount,
      text: extracted.applicantsText,
    },
    id: extracted.id,
    scrapeFrom: "hiringcafe",
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  
  return res;
};
