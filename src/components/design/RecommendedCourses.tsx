import CourseCard from './CourseCard';

/**
 * RecommendedCourses — displays a curated list of recommended courses
 * in a responsive grid (1 column on mobile, 2 columns on desktop).
 */
export default function RecommendedCourses() {
  return (
    <section>
      <h2 className="font-serif text-[#D4AF37] text-xl font-bold mb-6 tracking-wide uppercase text-sm">
        Рекомендуемые курсы
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CourseCard
          title="Тафсир Аль-Фатиха"
          instructor="Шейх Халид"
          image="/tafsir-course.png"
          progress={4}
          total={12}
          category="Тафсир"
        />
        <CourseCard
          title="Основы арабского языка"
          instructor="Фатима Аль-Хасан"
          image="/arabic-course.png"
          progress={7}
          total={20}
          category="Арабский"
        />
      </div>
    </section>
  );
}
