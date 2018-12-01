import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs/Subscription';
import { Course } from '../course/course.model';

@Component({
    selector: 'jhi-exercise-overview-component',
    templateUrl: './exercise-overview.component.html',
    styles: []
})
export class ExerciseOverviewComponent implements OnInit {
    course: Course;
    private subscription: Subscription;

    isCollapsed: boolean;
    showPreview: boolean;

    constructor(private route: ActivatedRoute) {}

    ngOnInit(): void {
        this.subscription = this.route.params.subscribe(params => {
            console.log(params);
        });
        this.showPreview = false;
    }
}
