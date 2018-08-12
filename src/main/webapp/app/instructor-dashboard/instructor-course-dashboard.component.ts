import {JhiAlertService} from 'ng-jhipster';
import {Component, OnDestroy, OnInit} from '@angular/core';
import {Subscription} from 'rxjs/Subscription';
import {ActivatedRoute} from '@angular/router';
import {
    Course,
    CourseParticipationService,
    CourseResultService,
    CourseService
} from '../entities/course';

@Component({
    selector: 'jhi-instructor-course-dashboard',
    templateUrl: './instructor-course-dashboard.component.html',
    providers: [
        JhiAlertService
    ]
})

export class InstructorCourseDashboardComponent implements OnInit, OnDestroy {

    course: Course;
    paramSub: Subscription;
    predicate: any;
    reverse: any;
    numberOfExercises = 0;
    rows = [];
    results = [];
    participations = [];    //[Participation]
    typeQuizExercise = []; //refactored to a more legible name
    typeProgrammingExercise = [];
    typeModellingExercise = [];
    allQuizExercises = [];
    allProgrammingExercises = [];
    allModellingExercises = [];
    titleQuizString = '';
    titleProgrammingString = '';
    titleModellingString = '';
    finalScores = [];
    exportReady = false;

    constructor(private route: ActivatedRoute,
                private courseService: CourseService,
                private courseResultService: CourseResultService,
                private courseParticipationService: CourseParticipationService) {
        this.reverse = false;
        this.predicate = 'id';
    }

    ngOnInit() {
        this.paramSub = this.route.params.subscribe(params => {
            this.courseService.find(params['courseId']).subscribe(res => {
                this.course = res.body;
                this.getResults(this.course.id);
            });
        });
    }

    getResults(courseId: number) {
        this.courseResultService.findAll(courseId).subscribe(res => { //this call gets all information to the results in the exercises
            this.results = res;
            this.groupResults();
        });

        this.courseParticipationService.findAll(courseId).subscribe(res => { //this call gets all information to the participation in the exercises
            this.participations = res;
            this.groupResults();
            //TODO: get rid of this call because all participations are probably stored in this.results anyway, so rather get them from there (DONE)
            //participations is necessary as in results not all students are stored
        });

    }

    groupResults() {

        if (!this.results || !this.participations || this.participations.length === 0 || this.results.length === 0) {
            return;
        }

        const rows = {};
        const exercisesSeen = {};
        let maximalZuErreichendePunkteQ = 0;
        let maximalZuErreichendePunkteM = 0;
        let maximalZuErreichendePunkteP = 0;

        for (const participation of this.participations) {

            if (!rows[participation.student.id]) {
                rows[participation.student.id] = {
                    'firstName': participation.student.firstName,
                    'lastName': participation.student.lastName,
                    'login': participation.student.login,
                    'participated': 0,
                    'participationInPercent': 0,
                    'successful': 0,
                    'successfullyCompletedInPercent': 0,
                    'overallScore': 0,
                };
            }
            //todo fde: double check if this is correctly calculated
           rows[participation.student.id].participated++;

            const exercise = participation.exercise;

            if (!exercisesSeen[exercise.id]) {
                exercisesSeen[exercise.id] = true;
                this.numberOfExercises++;


                switch (exercise.type) {
                    case 'quiz':
                        maximalZuErreichendePunkteQ += exercise.maxScore;

                        this.allQuizExercises[exercise.id] = {
                            'exId': exercise.id,
                            'exTitle': exercise.title
                        };
                        this.titleQuizString += exercise.title + ',';

                        break;

                    case 'programming-exercise':
                        maximalZuErreichendePunkteP += exercise.maxScore;

                        this.allProgrammingExercises[exercise.id] = {
                            'exId': exercise.id,
                            'exTitle': exercise.title
                        };
                        this.titleProgrammingString += exercise.title + ',';

                        break;
                    case 'modelling-exercise':
                        maximalZuErreichendePunkteM += exercise.maxScore;

                        this.allModellingExercises[exercise.id] = {
                            'exId': exercise.id,
                            'exTitle': exercise.title
                        };
                        this.titleModellingString += exercise.title + ',';
                        break;

                    default:
                }

            }
        }

        // Successful Participations as the total amount and a relative value to all Exercises

        //TODO: If these values are not needed right away, move this functionality to the place where we check these conditions anyway
        //if we are removing the table anyhow we do not need this functionality
        for (const result of this.results) {

            if (result.successful) {
                if (result.participation.exercise.type === 'quiz') {
                    if (result.rated === true) {
                        rows[result.participation.student.id].successful++;
                    }
                }
                else {
                    //TODO: also take into account that the last result before the due date has to be taken for programming exercise (see code below)
                    //TODO: also take into account that the last submission has to be taken for modelling exercises (see code below)
                    //also not needed if we remove functionality
                    rows[result.participation.student.id].successful++;
                }
            }
        }

        for (const studentId in rows) {
            rows[studentId].successfullyCompletedInPercent = (rows[studentId].successful / this.numberOfExercises) * 100;
        }

        // Relative amount of participation in all exercises
        // Since 1 user can have multiple participations studentSeen makes sure each student is only calculated once
        const studentSeen = {};


        for (const participation of this.participations) {
            if (!studentSeen[participation.student.id]) {
                studentSeen[participation.student.id] = true;
                rows[participation.student.id].participationInPercent = (rows[participation.student.id].participated / this.numberOfExercises) * 100;
            }
        }

        //why the hell are we doing this???
        this.rows = Object.keys(rows).map(key => rows[key]);

        this.getAllScoresForAllCourseParticipants();

        for (const student in this.finalScores) {
            this.rows[student].overallScore = this.finalScores[student].OverallScore;

        }
    }

    getAllScoresForAllCourseParticipants() {

        if (!this.results || !this.participations || this.participations.length === 0 || this.results.length === 0) {
            return;
        }

        const studentsQuizScores = {};
        const studentsProgrammingScores = {};
        const studentsModellingScores = {};


        for (const result of this.results) { //populating buckets of scores


            const student = result.participation.student;
            const exercise = result.participation.exercise;

            if (!studentsProgrammingScores[student.id]) {

                studentsProgrammingScores[student.id] = {
                    'firstName': student.firstName,
                    'lastName': student.lastName,
                    'id': student.id,
                    'login': student.login,
                    'email': student.email,
                    'exType': 'programming-exercise',
                    'totalScore': 0,
                    'scoreListP': {},
                    'scoreListPString': ''
                };
            }
            if (!studentsQuizScores[student.id]) {
                studentsQuizScores[student.id] = {
                    'firstName': student.firstName,
                    'lastName': student.lastName,
                    'id': student.id,
                    'login': student.login,
                    'email': student.email,
                    'exType': 'quiz',
                    'totalScore': 0,
                    'scoreListQ': {},
                    'scoreListQString': ''
                };
            }
            if (!studentsModellingScores[student.id]) {
                studentsModellingScores[student.id] = {
                    'firstName': student.firstName,
                    'lastName': student.lastName,
                    'id': student.id,
                    'login': student.login,
                    'email': student.email,
                    'exType': 'modelling-exercise',
                    'totalScore': 0,
                    'scoreListM': {},
                    'scoreListMString': ''
                };
            }





            let resultCompletionDate = new Date(result.completionDate);
            let dueDate = new Date(exercise.dueDate);

            switch (exercise.type) {
                case 'quiz':
                    if (result.rated === true) {   //There should only be 1 rated result

                        studentsQuizScores[student.id].scoreListQ[exercise.id] = {
                            'resCompletionDate': resultCompletionDate,
                            'exID': exercise.id,
                            'exTitle': exercise.title,
                            'absoluteScore': this.round((result.score * exercise.maxScore) / 100, 2)
                        };
                    }
                    break;

                case 'programming-exercise':
                    if (resultCompletionDate.getTime() <= dueDate.getTime()) {

                        const existingScore = studentsProgrammingScores[student.id].scoreListP[exercise.id];
                        if (existingScore == null || resultCompletionDate.getTime() > existingScore.resCompletionDate.getTime()) {    // we want to have the last result withing the due date (see above)
                            studentsProgrammingScores[student.id].scoreListP[exercise.id] = {
                                'resCompletionDate': resultCompletionDate,
                                'exID': exercise.id,
                                'exTitle': exercise.title,
                                'absoluteScore': this.round((result.score * exercise.maxScore) / 100, 2)
                            };
                        }
                    }
                    break;

                case 'modelling-exercise':
                    // we can also have results (due to the manual assessment) that appear after the completion date
                    // if (completionDate.getTime() <= dueDate.getTime()) {

                    const existingScore = studentsModellingScores[student.id].scoreListM[exercise.id];
                    if (existingScore == null || resultCompletionDate.getTime() > existingScore.resCompletionDate) {     // we want to have the last result
                        studentsModellingScores[student.id].scoreListM[exercise.id] = {
                            'resCompletionDate': resultCompletionDate,
                            'exID': exercise.id,
                            'exTitle': exercise.title,
                            'absoluteScore': this.round((result.score * exercise.maxScore) / 100, 2)
                        };
                    }
                    // }

                    break;
                default:
            }

        }


        //TODO: why the hell are we doing this?
        this.typeQuizExercise = Object.keys(studentsQuizScores).map(key => studentsQuizScores[key]);
        this.typeProgrammingExercise = Object.keys(studentsQuizScores).map(key => studentsProgrammingScores[key]);
        this.typeModellingExercise = Object.keys(studentsQuizScores).map(key => studentsModellingScores[key]);

        for (const studentsQuizScore of this.typeQuizExercise) {
            let totalScore = 0;
            for (const quizzes in studentsQuizScore.scoreListQ) {
                totalScore += studentsQuizScore.scoreListQ[quizzes].absoluteScore;
            }
            studentsQuizScore.totalScore = totalScore;
        }

        for (const studentsModellingScore of this.typeModellingExercise) {
            let totalScore = 0;
            for (const modellings in studentsModellingScore.scoreListM) {
                totalScore += studentsModellingScore.scoreListM[modellings].absoluteScore;
            }
            studentsModellingScore.totalScore = totalScore;
        }

        for (const studentsProgrammingScore of this.typeProgrammingExercise) {
            let totalScore = 0;
            for (const programmings in studentsProgrammingScore.scoreListP) {
                totalScore += studentsProgrammingScore.scoreListP[programmings].absoluteScore;
            }
            studentsProgrammingScore.totalScore = totalScore;
        }

        this.mergeScoresForExerciseCategories();
    }

    mergeScoresForExerciseCategories() {

        const finalScores = {};


        for (const studentsQuizScore of this.typeQuizExercise) {
            let quizScoreString = '';
            let quizEveryScore = {};


            for (const quiz in this.allQuizExercises) {
                let bool = true;
                let exerciseIdentifierQuiz = this.allQuizExercises[quiz].exId;
                //refactoring done changed 4 instances of exID to something more readable
                for (const scoresQ in studentsQuizScore.scoreListQ) {
                    let exID = studentsQuizScore.scoreListQ[scoresQ].exID;
                    if (exerciseIdentifierQuiz == exID) {
                        bool = false;
                        quizScoreString += studentsQuizScore.scoreListQ[scoresQ].absoluteScore + ',';
                        quizEveryScore = {
                            'exID': exID, 'exTitle': this.allQuizExercises[quiz].title,
                            'absoluteScore': studentsQuizScore.scoreListQ[scoresQ].absoluteScore
                        };
                    }
                }
                if (bool) {
                    quizEveryScore = {
                        'exID': exerciseIdentifierQuiz, 'exTitle': this.allQuizExercises[quiz].title,
                        'absoluteScore': 0
                    };
                    quizScoreString += '0,';
                }
            }

            if (!finalScores[studentsQuizScore.id]) {
                finalScores[studentsQuizScore.id] = {
                    'firstName': studentsQuizScore.firstName,
                    'lastName': studentsQuizScore.lastName,
                    'login': studentsQuizScore.login,
                    'email': studentsQuizScore.email,
                    'QuizTotalScore': 0,
                    'QuizEveryScore': {},
                    'QuizScoreString': '',
                    'ProgrammingTotalScore': 0,
                    'ProgrammingEveryScore': {},
                    'ProgrammingScoreString': '',
                    'ModellingTotalScore': 0,
                    'ModellingEveryScore': {},
                    'ModellingScoreString': '',
                    'OverallScore': 0
                };
            }
            finalScores[studentsQuizScore.id].QuizTotalScore = studentsQuizScore.totalScore;
            finalScores[studentsQuizScore.id].QuizEveryScore = quizEveryScore;
            finalScores[studentsQuizScore.id].QuizScoreString = quizScoreString;
        }

        for (const studentsModellingScore of this.typeModellingExercise) {

            if (!finalScores[studentsModellingScore.id]) {
                finalScores[studentsModellingScore.id] = {
                    'firstName': studentsModellingScore.firstName,
                    'lastName': studentsModellingScore.lastName,
                    'login': studentsModellingScore.login,
                    'email': studentsModellingScore.email,
                    'QuizTotalScore': 0,
                    'QuizEveryScore': {},
                    'QuizScoreString': '',
                    'ProgrammingTotalScore': 0,
                    'ProgrammingEveryScore': {},
                    'ProgrammingScoreString': '',
                    'ModellingTotalScore': 0,
                    'ModellingEveryScore': {},
                    'ModellingScoreString': '',
                    'OverallScore': 0
                };
            }

            let modellingScoreString = '';
            let modellingEveryScore = {};

            for (const modellings in this.allModellingExercises) {
                let bool = true;
                let exId = this.allModellingExercises[modellings].exId;

                for (const scores in studentsModellingScore.scoreListM) {
                    let exID = studentsModellingScore.scoreListM[scores].exID;
                    if (exId == exID) {
                        bool = false;
                        modellingScoreString += studentsModellingScore.scoreListM[scores].absoluteScore + ',';
                        modellingEveryScore = {
                            'exID': exID, 'exTitle': this.allModellingExercises[modellings].title,
                            'absoluteScore': studentsModellingScore.scoreListM[scores].absoluteScore
                        };
                    }
                }
                if (bool) {
                    modellingEveryScore = {
                        'exID': exId, 'exTitle': this.allModellingExercises[modellings].title,
                        'absoluteScore': 0
                    };
                    modellingScoreString += '0,';
                }
            }


            finalScores[studentsModellingScore.id].ModellingTotalScore = studentsModellingScore.totalScore;
            finalScores[studentsModellingScore.id].ModellEveryScore = modellingEveryScore;
            finalScores[studentsModellingScore.id].ModellingScoreString = modellingScoreString;


        }


        for (const studentsProgrammingScore of this.typeProgrammingExercise) {

            if (!finalScores[studentsProgrammingScore.id]) {
                finalScores[studentsProgrammingScore.id] = {
                    'firstName': studentsProgrammingScore.firstName,
                    'lastName': studentsProgrammingScore.lastName,
                    'login': studentsProgrammingScore.login,
                    'email': studentsProgrammingScore.email,
                    'QuizTotalScore': 0,
                    'QuizEveryScore': {},
                    'QuizScoreString': '',
                    'ProgrammingTotalScore': 0,
                    'ProgrammingEveryScore': {},
                    'ProgrammingScoreString': '',
                    'ModellingTotalScore': 0,
                    'ModellingEveryScore': {},
                    'ModellingScoreString': '',
                    'OverallScore': 0
                };
            }

            let programmingScoreString = '';
            let programmingEveryScore = {};

            for (const programmings in this.allProgrammingExercises) {
                let bool = true;
                let exId = this.allProgrammingExercises[programmings].exId;

                for (const scores in studentsProgrammingScore.scoreListP) {
                    let exID = studentsProgrammingScore.scoreListP[scores].exID;
                    if (exId == exID) {
                        bool = false;
                        programmingScoreString += studentsProgrammingScore.scoreListP[scores].absoluteScore + ',';
                        programmingEveryScore = {
                            'exID': exID, 'exTitle': this.allProgrammingExercises[programmings].title,
                            'absoluteScore': studentsProgrammingScore.scoreListP[scores].absoluteScore
                        };
                    }
                }
                if (bool) {
                    programmingEveryScore = {
                        'exID': exId, 'exTitle': this.allProgrammingExercises[programmings].title,
                        'absoluteScore': 0
                    };
                    programmingScoreString += '0,';
                }
            }

            finalScores[studentsProgrammingScore.id].ProgrammingTotalScore = studentsProgrammingScore.totalScore;
            finalScores[studentsProgrammingScore.id].ProgrammingEveryScore = programmingEveryScore;
            finalScores[studentsProgrammingScore.id].ProgrammingScoreString = programmingScoreString;

        }

        //gets all students that were not caught in results
        for (const participation of this.participations) {

            let modellingString = ''; //we define these strings to cover the calues needed in the export
            let quizString = '';
            let programmingString = '';
            let quizEveryScore = {};
            let modellingEveryScore = {};
            let programmingEveryScore = {};


            const student = participation.student;
            if (!finalScores[student.id]) {

             /*   console.log('do we need participation score?');
                console.log(student.firstName);
                console.log(student.id); */ //TODO: not needed in completion of project check usefulness and delete

                for (const modellingExercise in this.allModellingExercises) { //creating objects to store information about the given exercise
                    modellingString += '0,';
                    modellingEveryScore = {
                        'exID': this.allModellingExercises[modellingExercise].exID, 'exTitle': this.allModellingExercises[modellingExercise].title,
                        'absoluteScore': 0
                    };
                }
                for (const quizExercise in this.allQuizExercises) {
                    quizString += '0,';
                    quizEveryScore = {
                        'exID': this.allQuizExercises[quizExercise].exID, 'exTitle': this.allQuizExercises[quizExercise].title,
                        'absoluteScore': 0
                    };
                }
                for (const programmingExercise in this.allProgrammingExercises) {
                    programmingString += '0,';
                    programmingEveryScore = {
                        'exID': this.allProgrammingExercises[programmingExercise].exID, 'exTitle': this.allProgrammingExercises[programmingExercise].title,
                        'absoluteScore': 0
                    };
                }

                finalScores[student.id] = { //creating an object for each student containing needed information
                    'firstName': student.firstName,
                    'lastName': student.lastName,
                    'login': student.login,
                    'email': student.email,
                    'QuizTotalScore': 0,
                    'QuizEveryScore': quizEveryScore,
                    'QuizScoreString': quizString,
                    'ProgrammingTotalScore': 0,
                    'ProgrammingEveryScore': programmingEveryScore,
                    'ProgrammingScoreString': programmingString,
                    'ModellingTotalScore': 0,
                    'ModellingEveryScore': modellingEveryScore,
                    'ModellingScoreString': modellingString,
                    'OverallScore': 0
                };
            } else {
                finalScores[student.id].OverallScore = finalScores[student.id].QuizTotalScore
                    + finalScores[student.id].ProgrammingTotalScore + finalScores[student.id].ModellingTotalScore;
            }
        }

        this.finalScores = Object.keys(finalScores).map(key => finalScores[key]);
        this.exportReady = true;
    }

    exportResults() { //method for exporting the csv with the needed data

        this.getAllScoresForAllCourseParticipants();

        if (this.exportReady && this.finalScores.length > 0) {
            const rows = [];
            this.finalScores.forEach((result, index) => {

                const firstName = result.firstName.trim();
                const lastName = result.lastName.trim();
                const studentId = result.login.trim();
                const email = result.email.trim();
                const quiz = result.QuizTotalScore;
                const programming = result.ProgrammingTotalScore;
                const modelling = result.ModellingTotalScore;
                const score = result.OverallScore;
                const quizString = result.QuizScoreString;
                const modellingString = result.ModellingScoreString;
                const programmingString = result.ProgrammingScoreString;


                if (index === 0) {
                    const info= 'data:text/csv;charset=utf-8,FirstName,LastName,TumId,Email,QuizTotalScore,'; //shortening line length and complexity
                    rows.push(info + this.titleQuizString + 'ProgrammingTotalScore,' + this.titleProgrammingString + 'ModellingTotalScore,' + this.titleModellingString + 'OverallScore');
                    rows.push(firstName + ',' + lastName + ',' + studentId + ',' + email + ',' + quiz + ',' + quizString + '' + programming + ',' + programmingString + '' + modelling + ',' + modellingString + '' + score);
                } else {
                    rows.push(firstName + ',' + lastName + ',' + studentId + ',' + email + ',' + quiz + ',' + quizString + '' + programming + ',' + programmingString + '' + modelling + ',' + modellingString + '' + score);
                }
            });
            const csvContent = rows.join('\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', 'course_' + this.course.title + '-scores.csv');
            document.body.appendChild(link); // Required for FF
            link.click();
        }
    }

    ngOnDestroy() {
        this.paramSub.unsubscribe();
    }

    round(value, decimals): Number {
        return Number(Math.round(Number(value + 'e' + decimals)) + 'e-' + decimals);
    }

    roundWithPower(number, precision): Number {
        var factor = Math.pow(10, precision);
        var tempNumber = number * factor;
        var roundedTempNumber = Math.round(tempNumber);
        return roundedTempNumber / factor;
    };


    callback() {
    }
}
