import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Subscription } from 'rxjs/Subscription';
import { JhiAlertService, JhiEventManager } from 'ng-jhipster';

import { QuizExercise } from './quiz-exercise.model';
import { QuizExerciseService } from './quiz-exercise.service';
import { Principal } from '../../core';
import { ActivatedRoute } from '@angular/router';
import * as moment from 'moment';
import { Course, CourseService } from '../course';
import { Question } from '../question';

@Component({
    selector: 'jhi-quiz-exercise',
    templateUrl: './quiz-exercise.component.html'
})
export class QuizExerciseComponent implements OnInit, OnDestroy {
    private subscription: Subscription;
    private eventSubscriber: Subscription;

    QuizStatus = {
        HIDDEN: 'Hidden',
        VISIBLE: 'Visible',
        ACTIVE: 'Active',
        CLOSED: 'Closed',
        OPEN_FOR_PRACTICE: 'Open for Practice'
    };

    quizExercises: QuizExercise[];
    course: Course;
    predicate: string;
    reverse: boolean;
    courseId: number;

    constructor(
        private courseService: CourseService,
        private quizExerciseService: QuizExerciseService,
        private jhiAlertService: JhiAlertService,
        private eventManager: JhiEventManager,
        private principal: Principal,
        private route: ActivatedRoute
    ) {
        this.predicate = 'id';
        this.reverse = true;
    }

    ngOnInit() {
        this.load();
        this.registerChangeInQuizExercises();
    }

    load() {
        this.subscription = this.route.params.subscribe(params => {
            this.courseId = params['courseId'];
            this.loadForCourse(this.courseId);
        });
    }

    loadForCourse(courseId: number) {
        this.courseService.find(this.courseId).subscribe(courseResponse => {
            this.course = courseResponse.body;
            this.quizExerciseService.findForCourse(courseId).subscribe(
                (res: HttpResponse<QuizExercise[]>) => {
                    this.quizExercises = res.body;
                    // reconnect exercise with course
                    this.quizExercises.forEach(quizExercise => {
                        quizExercise.course = this.course;
                    });
                    this.setQuizExercisesStatus();
                },
                (res: HttpErrorResponse) => this.onError(res)
            );
        });
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
        this.eventManager.destroy(this.eventSubscriber);
    }

    trackId(index: number, item: QuizExercise) {
        return item.id;
    }

    registerChangeInQuizExercises() {
        this.eventSubscriber = this.eventManager.subscribe('quizExerciseListModification', () => this.load());
    }

    private onError(error: HttpErrorResponse) {
        this.jhiAlertService.error(error.message);
    }

    /**
     * Checks if the quiz exercise is over
     * @param quizExercise The quiz exercise we want to know if it's over
     * @returns {boolean} true if the quiz exercise is over, false if not.
     */
    quizIsOver(quizExercise: QuizExercise) {
        if (quizExercise.isPlannedToStart) {
            const plannedEndMoment = moment(quizExercise.releaseDate).add(quizExercise.duration, 'seconds');
            return plannedEndMoment.isBefore(moment());
            // the quiz is over
        }
        // the quiz hasn't started yet
        return false;
    }

    /**
     * Convert seconds to full minutes
     * @param seconds {number} the number of seconds
     * @returns {number} the number of full minutes
     */
    fullMinutesForSeconds(seconds: number) {
        return Math.floor(seconds / 60);
    }

    /**
     * Set the quiz open for practice
     *
     * @param quizExerciseId the quiz exercise id to start
     */
    openForPractice(quizExerciseId: number) {
        this.quizExerciseService.openForPractice(quizExerciseId).subscribe(
            () => {
                this.loadOne(quizExerciseId);
            },
            (res: HttpErrorResponse) => {
                this.onError(res);
                this.loadOne(quizExerciseId);
            }
        );
    }

    setQuizExercisesStatus() {
        this.quizExercises.forEach(quizExercise => (quizExercise.status = this.statusForQuiz(quizExercise)));
    }

    /**
     * Checks if the User is Admin/Instructor or Teaching Assistant
     * @returns {boolean} true if the User is an Admin/Instructor, false if not.
     */
    userIsInstructor() {
        return this.principal.hasAnyAuthorityDirect(['ROLE_ADMIN', 'ROLE_INSTRUCTOR']);
    }

    /**
     * Method for determining the current status of a quiz exercise
     * @param quizExercise The quiz exercise we want to determine the status of
     * @returns {string} The status as a string
     */
    statusForQuiz(quizExercise: QuizExercise) {
        if (quizExercise.isPlannedToStart && quizExercise.remainingTime != null) {
            if (quizExercise.remainingTime <= 0) {
                // the quiz is over
                return quizExercise.isOpenForPractice ? this.QuizStatus.OPEN_FOR_PRACTICE : this.QuizStatus.CLOSED;
            } else {
                return this.QuizStatus.ACTIVE;
            }
        }
        // the quiz hasn't started yet
        return quizExercise.isVisibleBeforeStart ? this.QuizStatus.VISIBLE : this.QuizStatus.HIDDEN;
    }

    /**
     * Start the given quiz-exercise immediately
     *
     * @param quizExerciseId the quiz exercise id to start
     */
    startQuiz(quizExerciseId: number) {
        this.quizExerciseService.start(quizExerciseId).subscribe(
            () => {
                this.loadOne(quizExerciseId);
            },
            (res: HttpErrorResponse) => {
                this.onError(res);
                this.loadOne(quizExerciseId);
            }
        );
    }

    /**
     * Do not load all quizExercise if only one has changed
     *
     * @param quizExerciseId
     */
    private loadOne(quizExerciseId: number) {
        this.quizExerciseService.find(quizExerciseId).subscribe((res: HttpResponse<QuizExercise>) => {
            const index = this.quizExercises.findIndex(quizExercise => quizExercise.id === quizExerciseId);
            const exercise = res.body;
            exercise.status = this.statusForQuiz(exercise);
            if (index === -1) {
                this.quizExercises.push(exercise);
            } else {
                this.quizExercises[index] = exercise;
            }
        });
    }

    /**
     * Exports questions for the given quiz exercise in json file
     * @param quizExerciseId The quiz exercise id we want to export
     * @param exportAll If true exports all questions, else exports only those whose export flag is true
     */
    exportQuizById(quizExerciseId: number, exportAll: boolean) {
        this.quizExerciseService.find(quizExerciseId).subscribe((res: HttpResponse<QuizExercise>) => {
            const exercise = res.body;
            this.quizExerciseService.exportQuiz(exercise.questions, exportAll);
        });
    }

    /**
     * Make the given quiz-exercise visible to students
     *
     * @param quizExerciseId the quiz exercise id to start
     */
    showQuiz(quizExerciseId: number) {
        this.quizExerciseService.setVisible(quizExerciseId).subscribe(
            () => {
                this.loadOne(quizExerciseId);
            },
            (res: HttpErrorResponse) => {
                this.onError(res);
                this.loadOne(quizExerciseId);
            }
        );
    }

    callback() {}
}
