import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "./progress-ring";
import { Play, Book, CheckCircle, HardHat, AlertTriangle } from "lucide-react";
import { Course, UserProgress } from "@shared/schema";
import { COURSE_TYPES } from "@/lib/constants";

interface CourseCardProps {
  course: Course;
  progress?: UserProgress;
  onStartCourse: (courseId: string) => void;
}

export function CourseCard({ course, progress, onStartCourse }: CourseCardProps) {
  const courseType = COURSE_TYPES[course.type as keyof typeof COURSE_TYPES];
  const progressPercent = progress?.progress || 0;
  const isCompleted = progress?.completed || false;
  
  const getButtonConfig = () => {
    switch (course.type) {
      case 'workplace-safety':
        return { text: '교육 시작하기', icon: Play, testId: 'button-start-workplace-safety' };
      case 'hazard-prevention':
        return { text: '교육 자료 보기', icon: Book, testId: 'button-start-hazard-prevention' };
      case 'tbm':
        return { text: 'TBM 교육 받기', icon: CheckCircle, testId: 'button-start-tbm' };
      default:
        return { text: '교육 시작하기', icon: Play, testId: 'button-start-course' };
    }
  };

  const buttonConfig = getButtonConfig();
  const ButtonIcon = buttonConfig.icon;

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1 flex flex-col"
      data-testid={`course-card-${course.type}`}
    >
      <CardContent className="p-6 flex-grow flex flex-col">
        <div className={`flex items-center justify-center w-16 h-16 ${courseType.bgColor} rounded-full mb-4 mx-auto`}>
          <div className={`${courseType.textColor} text-2xl`}>
            {course.type === 'workplace-safety' && <HardHat className="w-8 h-8" />}
            {course.type === 'hazard-prevention' && <AlertTriangle className="w-8 h-8" />}
            {course.type === 'tbm' && <CheckCircle className="w-8 h-8" />}
          </div>
        </div>

        <h3 
          className="text-xl font-semibold text-center mb-2 korean-text" 
          data-testid={`course-title-${course.type}`}
        >
          {course.title}
        </h3>

        {course.type === 'tbm' && (
          <Badge 
            className={`${courseType.bgColor} ${courseType.textColor} mb-4 mx-auto block w-fit`}
            data-testid="course-type-badge"
          >
            Tool Box Meeting
          </Badge>
        )}

        <p 
          className="text-sm text-muted-foreground text-center mb-6 korean-text flex-grow" 
          data-testid={`course-description-${course.type}`}
        >
          {course.description}
        </p>

        {course.type === 'workplace-safety' && (
          <div className="flex justify-center my-4">
            <ProgressRing progress={progressPercent} />
          </div>
        )}

        {course.type === 'hazard-prevention' && (
          <div className="grid grid-cols-2 gap-4 mt-4 text-xs mb-6" data-testid="hazard-prevention-info">
            <div>
              <div className={`font-medium ${courseType.textColor}`}>[Key Notice #1]</div>
              <div>[Notice Content]</div>
            </div>
            <div>
              <div className={`font-medium ${courseType.textColor}`}>[Key Notice #2]</div>
              <div>[Notice Content]</div>
            </div>
            <div>
              <div className={`font-medium ${courseType.textColor}`}>[Guideline #1]</div>
              <div>[Guideline Content]</div>
            </div>
            <div>
              <div className={`font-medium ${courseType.textColor}`}>[Guideline #2]</div>
              <div>[Guideline Content]</div>
            </div>
          </div>
        )}

        {course.type === 'tbm' && (
          <div className="grid grid-cols-2 gap-4 text-xs mb-6" data-testid="tbm-info">
            <div>
              <div className={`font-medium ${courseType.textColor}`}>[Schedule Info]</div>
              <div>[Schedule Details]</div>
            </div>
            <div>
              <div className={`font-medium ${courseType.textColor}`}>[Risk Assessment]</div>
              <div>[Assessment Topic]</div>
            </div>
            <div>
              <div className={`font-medium ${courseType.textColor}`}>[Prevention Memo]</div>
              <div>[Memo Content]</div>
            </div>
            <div>
              <div className={`font-medium ${courseType.textColor}`}>[Communication]</div>
              <div>[Communication Topic]</div>
            </div>
          </div>
        )}

        <Button
          className={`w-full ${courseType.buttonColor} text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center korean-text mt-auto`}
          onClick={() => onStartCourse(course.id)}
          data-testid={buttonConfig.testId}
        >
          <ButtonIcon className="w-4 h-4 mr-2" />
          {buttonConfig.text}
        </Button>
      </CardContent>
    </Card>
  );
}
