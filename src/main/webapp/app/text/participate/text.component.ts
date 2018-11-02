import { Component, OnDestroy, OnInit } from '@angular/core';

import { Participation, ParticipationService } from 'app/entities/participation';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { JhiAlertService } from 'ng-jhipster';
import { TextSubmission } from 'app/entities/text-submission';
import { TextExercise } from 'app/entities/text-exercise';

@Component({
    templateUrl: './text.component.html',
    providers: [ParticipationService]
})
export class TextComponent implements OnInit, OnDestroy {
    private subscription: Subscription;
    private id: number;
    private submission: TextSubmission;
    private textExercise: TextExercise;

    constructor(
        private route: ActivatedRoute,
        private participationService: ParticipationService,
        private jhiAlertService: JhiAlertService
    ) {}

    ngOnInit() {
        this.subscription = this.route.params.subscribe(params => {
            this.id = params['id'];
        });

        this.init();
    }

    ngOnDestroy() {}

    init() {
        this.participationService.findParticipation(1, this.id).subscribe(
            (response: HttpResponse<Participation>) => {
                this.applyParticipationFull(response.body);
            },
            (res: HttpErrorResponse) => this.onError(res)
        );
    }

    applyParticipationFull(participation: Participation) {
        this.applyTextFull(participation.exercise as TextExercise);

        // apply submission if it exists
        if (participation.results.length) {
            this.submission = participation.results[0].submission as TextSubmission;
            //
            //     // update submission time
            //     this.updateSubmissionTime();
            //
            //     // show submission answers in UI
            //     this.applySubmission();
            //
            //     if (participation.results[0].resultString && this.quizExercise.ended) {
            //         // quiz has ended and results are available
            //         this.showResult(participation.results);
            //     }
        } else {
            this.submission = new TextSubmission();
        }
    }

    applyTextFull(textExercise: TextExercise) {
        this.textExercise = textExercise;
    }

    private onError(error: HttpErrorResponse) {
        this.jhiAlertService.error(error.message, null, null);
    }
}