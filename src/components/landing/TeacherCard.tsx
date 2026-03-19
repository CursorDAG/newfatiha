type TeacherCardProps = {
  name: string;
  avatar: string | null;
  bio: string | null;
  skills: string[];
};

export function TeacherCard({ name, avatar, bio, skills }: TeacherCardProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const displaySkills = skills.length > 0 ? skills : ["Преподаватель"];

  return (
    <div className="group bg-white border border-slate-200 rounded-2xl p-7 hover:border-emerald-300 hover:shadow-xl transition-all duration-300">
      {/* Avatar */}
      <div className="flex justify-center mb-5">
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            className="w-24 h-24 rounded-full object-cover border-4 border-emerald-100 group-hover:border-emerald-200 transition-colors"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-2xl font-bold border-4 border-emerald-100 group-hover:border-emerald-200 transition-colors">
            {initials}
          </div>
        )}
      </div>

      {/* Name */}
      <h3 className="text-xl font-bold text-slate-800 text-center mb-3 group-hover:text-emerald-700 transition-colors">
        {name}
      </h3>

      {/* Bio */}
      {bio && (
        <p className="text-slate-600 text-sm leading-relaxed text-center mb-4 line-clamp-3">
          {bio}
        </p>
      )}

      {/* Skills */}
      <div className="flex flex-wrap gap-2 justify-center mt-auto pt-4 border-t border-slate-100">
        {displaySkills.map((skill, index) => (
          <span
            key={index}
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
}
