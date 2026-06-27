"use client";
import { useState } from "react";
import { GraduationCap } from "lucide-react";

type TeacherCardProps = {
  name: string;
  avatar: string | null;
  bio: string | null;
  skills: string[];
};

export function TeacherCard({ name, avatar, bio, skills }: TeacherCardProps) {
  const [imageError, setImageError] = useState(false);

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const displaySkills = skills.length > 0 ? skills : ["Преподаватель"];

  return (
    <div className="group glass-card p-8 flex flex-col items-center text-center hover:-translate-y-2 hover:shadow-2xl hover:shadow-gold/20 transition-all duration-300">
      {/* Avatar with gold ring */}
      <div className="relative mb-6 group-hover:scale-110 transition-transform duration-300">
        <div className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-gold/40 to-transparent opacity-60 group-hover:opacity-100 blur-[2px] transition-opacity" />
        {avatar && !imageError ? (
          <img
            src={avatar}
            alt={name}
            className="relative w-24 h-24 rounded-full object-cover border-2 border-gold/40 group-hover:border-gold/70 transition-colors"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-gold to-[#8C6D1F] flex items-center justify-center text-[#031410] text-2xl font-bold font-serif border-2 border-gold/40 group-hover:border-gold/70 transition-colors">
            {initials}
          </div>
        )}
        {/* Credential badge */}
        <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#031410] border border-gold/40 flex items-center justify-center text-gold">
          <GraduationCap className="w-4 h-4" strokeWidth={1.75} />
        </span>
      </div>

      {/* Name */}
      <h3 className="text-xl font-bold text-cream mb-2 font-serif group-hover:text-gold transition-colors">
        {name}
      </h3>

      {/* Bio */}
      {bio && (
        <p className="text-cream/55 text-sm leading-relaxed mb-5 line-clamp-3">
          {bio}
        </p>
      )}

      {/* Skills */}
      <div className="flex flex-wrap gap-2 justify-center mt-auto pt-5 border-t border-gold/12 w-full">
        {displaySkills.map((skill, index) => (
          <span
            key={index}
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gold/10 text-gold-light border border-gold/20"
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
}
