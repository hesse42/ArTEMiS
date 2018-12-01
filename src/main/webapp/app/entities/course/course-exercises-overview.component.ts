import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs/Subscription';
import { Course } from './course.model';

export enum item {
    'quiz',
    'programming',
    'text',
    'modeling',
    'upload'
}

@Component({
    selector: 'jhi-course-overview',
    templateUrl: './course-exercises-overview.component.html'
})
export class CourseExercisesOverviewComponent implements OnInit {
    course: Course;
    private subscription: Subscription;

    showPreview: boolean;

    ExerciseType = ['quiz', 'programming', 'text', 'modeling', 'upload'];
    isQuestionCollapsed = new Map<item, boolean>();

    constructor(private route: ActivatedRoute) {}

    ngOnInit(): void {
        this.subscription = this.route.params.subscribe(params => {
            console.log(params);
        });

        for (const exerciseType in item) {
            this.isQuestionCollapsed[exerciseType] = false;
        }
        this.showPreview = false;
    }
}
