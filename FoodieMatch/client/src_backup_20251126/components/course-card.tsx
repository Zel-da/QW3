import { HardHat, Factory, Car, BookOpen, Shield, MessageSquare, ClipboardList, Clock, Tag, CheckCircle, XCircle } from 'lucide-react';
import { Course, UserProgress, UserAssessment } from '@shared/schema';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CourseCardProps {
  course: Course;
  progress?: UserProgress;
  assessment?: UserAssessment;
  onStartCourse: (courseId: string) => void;
}

const iconMap: { [key: string]: React.ElementType } = {
  'hard-hat': HardHat,
  'factory': Factory,
  'car': Car,
  'book-open': BookOpen,
  'shield': Shield,
  'message-square': MessageSquare,
  'clipboard-list': ClipboardList,
  'clock': Clock,
  'tag': Tag,
};

export function CourseCard({ course, progress, assessment, onStartCourse }: CourseCardProps) {
  const videoProgress = progress?.progress || 0;
  const IconComponent = iconMap[course.icon] || BookOpen;

  const getQuizStatus = () => {
    if (assessment?.passed) {
      return { text: '통과', color: 'text-green-600', Icon: CheckCircle };
    }
    if (assessment) {
      return { text: '미통과', color: 'text-red-600', Icon: XCircle };
    }
    if (videoProgress === 100) {
      return { text: '응시 가능', color: 'text-blue-600', Icon: ClipboardList };
    }
    return { text: '미완료', color: 'text-muted-foreground', Icon: Clock };
  };

  const quizStatus = getQuizStatus();

  const getButtonText = () => {
    if (assessment?.passed) return '이수 완료';
    if (videoProgress === 100) return '퀴즈 응시하기';
    return '학습 시작';
  };

  return (
    <Card className="flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-xl font-bold">{course.title}</CardTitle>
            <div className={`flex items-center justify-center w-12 h-12 bg-${course.color}-100 rounded-full flex-shrink-0`}>
              <IconComponent className={`text-${course.color}-600 w-6 h-6`} />
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col">
        <p className="text-sm text-muted-foreground mb-4 flex-grow">{course.description}</p>
        <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
                <span className="font-medium flex items-center"><Clock className="w-4 h-4 mr-2 text-muted-foreground"/>영상 시청</span>
                <span className="font-semibold">{videoProgress}%</span>
            </div>
            <Progress value={videoProgress} className="h-2" />
            <div className="flex items-center justify-between">
                <span className="font-medium flex items-center"><quizStatus.Icon className={`w-4 h-4 mr-2 ${quizStatus.color}`}/>퀴즈</span>
                <span className={`font-semibold ${quizStatus.color}`}>{quizStatus.text}</span>
            </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={() => onStartCourse(course.id)} className="w-full mt-4" disabled={assessment?.passed}>
          {getButtonText()}
        </Button>
      </CardFooter>
    </Card>
  );
}
