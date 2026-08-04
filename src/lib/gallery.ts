export interface GalleryImage {
  src: string;
  alt: string;
}

export interface GalleryEvent {
  id: string;
  title: string;
  meta: string;
  images: GalleryImage[];
}

export interface GalleryYear {
  year: number;
  events: GalleryEvent[];
}

const p = (n: string, alt: string): GalleryImage => ({
  src: `/assets/gallery/${n}.png`,
  alt,
});

const SLOT = [
  "Keynote stage",
  "Participants at work",
  "Panel discussion",
  "Team collaboration",
  "Winner ceremony",
  "Workshop demo",
];

export const GALLERY: GalleryYear[] = [
  {
    year: 2026,
    events: [
      {
        id: "codestorm-2026",
        title: "CodeStorm Hackathon",
        meta: "Hackathon · Main Auditorium",
        images: [
          p("g01", SLOT[0]),
          p("g02", SLOT[1]),
          p("g03", SLOT[3]),
          p("g04", SLOT[4]),
          p("g05", SLOT[2]),
          p("g06", SLOT[5]),
        ],
      },
      {
        id: "ai-summit-2026",
        title: "AI Innovation Summit",
        meta: "Summit · Seminar Hall B",
        images: [
          p("g07", SLOT[2]),
          p("g08", SLOT[0]),
          p("g09", SLOT[4]),
          p("g10", SLOT[3]),
          p("g11", SLOT[1]),
        ],
      },
      {
        id: "webforge-2026",
        title: "WebForge Workshop",
        meta: "Workshop · Innovation Lab",
        images: [
          p("g12", SLOT[5]),
          p("g02", SLOT[3]),
          p("g05", SLOT[1]),
          p("g08", SLOT[0]),
          p("g01", SLOT[4]),
          p("g10", SLOT[2]),
        ],
      },
      {
        id: "techtalk-scaling-2026",
        title: "TechTalk: Scaling Systems",
        meta: "Tech Talk · Crescent Theater",
        images: [
          p("g03", SLOT[0]),
          p("g07", SLOT[2]),
          p("g11", SLOT[4]),
          p("g04", SLOT[5]),
          p("g09", SLOT[1]),
        ],
      },
    ],
  },
  {
    year: 2025,
    events: [
      {
        id: "ideathon-2025",
        title: "Ideathon",
        meta: "Idea Pitching · Startup Cell",
        images: [
          p("g04", SLOT[0]),
          p("g09", SLOT[3]),
          p("g01", SLOT[4]),
          p("g06", SLOT[2]),
          p("g12", SLOT[1]),
        ],
      },
      {
        id: "techfest-2025",
        title: "Annual Tech Fest",
        meta: "Festival · Campus Grounds",
        images: [
          p("g02", SLOT[1]),
          p("g05", SLOT[0]),
          p("g08", SLOT[3]),
          p("g10", SLOT[5]),
          p("g03", SLOT[4]),
          p("g11", SLOT[2]),
        ],
      },
      {
        id: "hacknight-2025",
        title: "Hacknight",
        meta: "24h Sprint · Innovation Lab",
        images: [
          p("g06", SLOT[1]),
          p("g10", SLOT[4]),
          p("g02", SLOT[0]),
          p("g07", SLOT[5]),
          p("g01", SLOT[3]),
        ],
      },
    ],
  },
  {
    year: 2024,
    events: [
      {
        id: "symposium-2024",
        title: "Annual Symposium",
        meta: "Symposium · Main Auditorium",
        images: [
          p("g08", SLOT[0]),
          p("g03", SLOT[2]),
          p("g06", SLOT[4]),
          p("g11", SLOT[1]),
          p("g05", SLOT[5]),
        ],
      },
      {
        id: "buildathon-2024",
        title: "Build-a-thon",
        meta: "Making Contest · Labs Block",
        images: [
          p("g09", SLOT[3]),
          p("g12", SLOT[1]),
          p("g04", SLOT[0]),
          p("g02", SLOT[5]),
          p("g07", SLOT[4]),
          p("g10", SLOT[2]),
        ],
      },
      {
        id: "demo-day-2024",
        title: "Demo Day",
        meta: "Showcase · Crescent Theater",
        images: [
          p("g01", SLOT[4]),
          p("g11", SLOT[0]),
          p("g05", SLOT[2]),
          p("g08", SLOT[1]),
          p("g03", SLOT[3]),
        ],
      },
    ],
  },
];
