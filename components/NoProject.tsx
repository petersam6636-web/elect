"use client";

import { useRouter } from "next/navigation";
import { Plus, Vote, Sparkles, Users, ShieldCheck } from "lucide-react";

export default function NoProject() {
  const router = useRouter();

  const handleCreateProject = () => {
    router.push("/home/starting");
  };

  return (
    <main className="page-shell relative isolate flex min-h-dvh w-full items-center justify-center overflow-hidden bg-transparent px-2 py-4 sm:py-8 md:px-3">

      {/* Main card */}
      <section className="relative z-10 w-full max-w-[420px]">
        <div className="absolute -inset-px rounded-[28px] bg-gradient-to-br from-blue-400/25 via-blue-900/10 to-blue-300/15 opacity-70 blur-[1px]" />

        <div className="project-card relative overflow-hidden rounded-[25px] border border-blue-400/[0.16] bg-[#111722] px-5 py-7 text-center shadow-[0_25px_100px_rgba(0,0,0,0.55),0_0_50px_rgba(59,130,246,0.045)] backdrop-blur-xl sm:rounded-[27px] sm:px-9 sm:py-11">

          {/* Card ambient glow */}

          {/* Top label */}

          {/* Icon */}
          <div className="card-icon relative mx-auto mt-5 flex h-16 w-16 items-center justify-center rounded-[23px] border border-blue-300/20 bg-gradient-to-br from-blue-400/[0.14] to-blue-950/40 text-blue-300 shadow-[inset_0_0_25px_rgba(96,165,250,0.08),0_0_35px_rgba(59,130,246,0.09)] sm:mt-7 sm:h-[76px] sm:w-[76px]">
            <Vote size={34} strokeWidth={1.4} />

            <div className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-blue-300/20 bg-[#151d2a] text-blue-300 shadow-lg">
              <Sparkles size={13} />
            </div>
          </div>

          {/* Heading */}
          <h2 className="relative mt-4 text-[22px] font-bold tracking-tight text-white sm:mt-6 sm:text-2xl">
            No project yet<span className="text-blue-400">.</span>
          </h2>

          <p className="relative mx-auto mt-2 max-w-[310px] text-[12px] leading-[1.65] text-zinc-400 sm:mt-3 sm:text-[13px] sm:leading-6">
            Your voting workspace is ready. Create your first election
            project and give everyone a chance to make their voice count.
          </p>

          {/* Feature details */}

          {/* Button */}
          <button
            type="button"
            onClick={handleCreateProject}
            title="Add a new vote"
            aria-label="Add a new vote"
            className="group cursor-pointer relative mx-auto mt-5 inline-flex h-11 w-full max-w-[230px] items-center justify-center gap-2 overflow-hidden rounded-xl bg-blue-400 px-6 text-sm font-bold text-[#07101c] shadow-[0_5px_25px_rgba(59,130,246,0.15)] transition duration-300 hover:-translate-y-0.5 hover:bg-blue-300 hover:shadow-[0_8px_35px_rgba(59,130,246,0.25)] active:translate-y-0 active:scale-[0.98] sm:mt-7 sm:h-12"
          >
            <Plus size={18} strokeWidth={2.5} />
            Create your first vote
          </button>

          <p className="relative mt-3 text-[9px] tracking-wide text-zinc-600 sm:mt-5 sm:text-[10px]">
            YOUR VOICE. YOUR CHOICE. YOUR VOTE.
          </p>
        </div>
      </section>

      <style jsx>{`
        @media (max-height: 700px) and (max-width: 480px) {
          .page-shell {
            padding-top: 8px !important;
            padding-bottom: 8px !important;
          }

          .project-card {
            padding-top: 18px !important;
            padding-bottom: 18px !important;
          }

          .card-icon {
            margin-top: 12px !important;
            width: 54px !important;
            height: 54px !important;
            border-radius: 18px !important;
          }

          .card-icon > svg {
            width: 27px;
            height: 27px;
          }
        }

        @media (max-height: 620px) and (max-width: 480px) {
          .project-card {
            padding-top: 13px !important;
            padding-bottom: 13px !important;
          }

          .card-icon {
            margin-top: 8px !important;
            width: 46px !important;
            height: 46px !important;
          }

          .project-card h2 {
            margin-top: 10px !important;
            font-size: 19px !important;
          }

          .project-card p {
            margin-top: 6px !important;
            line-height: 1.4 !important;
          }

          .project-card button {
            margin-top: 12px !important;
            height: 38px !important;
          }

          .project-card .feature-row {
            margin-top: 10px !important;
            padding-top: 8px !important;
            padding-bottom: 8px !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .page-shell div[class*="animate-"] {
            animation: none !important;
          }
        }
      `}</style>
    </main>
  );
}