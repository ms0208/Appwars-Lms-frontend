import TopNavbar from "@/src/components/student/TopNavbar";
import Sidebar from "@/src/components/student/Sidebar";

export default function StudentLayout({ children }) {
  return (
    <div className="min-h-screen bg-white md:flex">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <TopNavbar studentName="Aarav" />
        {children}
      </div>
    </div>
  );
}
