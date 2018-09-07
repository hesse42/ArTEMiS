package de.tum.in.www1.artemis.repository;

import de.tum.in.www1.artemis.domain.Result;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;


/**
 * Spring Data JPA repository for the Result entity.
 */
@SuppressWarnings("unused")
@Repository
public interface ResultRepository extends JpaRepository<Result, Long> {

    List<Result> findByParticipationIdOrderByCompletionDateDesc(Long participationId);

    List<Result> findByParticipationIdAndRatedOrderByCompletionDateDesc(Long participationId, boolean rated);

    List<Result> findByParticipationExerciseIdOrderByCompletionDateAsc(Long exerciseId);

    @Query("select r from Result r where r.completionDate = (select max(rr.completionDate) from Result rr where rr.participation.exercise.id = :exerciseId and rr.participation.student.id = r.participation.student.id) and r.participation.exercise.id = :exerciseId order by r.completionDate asc")
    List<Result> findLatestResultsForExercise(@Param("exerciseId") Long exerciseId);

    //native query to get data from backend. where only most recent result gets called to reduce load on server
    //@Query q = em.createNativeQuery("select e.due_date, r.completion_date, e.discriminator, r.rated from Result r, Exercise e, Participation p where r.participation_id = p.id and p.exercise_id = e.id and e.course_id = 13 and e.due_date is not null  and (r.rated = 1 or (r.rated is null && r.completion_date <= e.due_date)) group by p.id order by r.completion_date desc");
    //List<Object[]> authors = q.getResultList();

    //native query to get data from backend. All sorts of exercises by courseID will be returned. 
    //@Query exerciseQuery = em.createNativeQuery("SELECT title, id ,max_score, discriminator FROM artemis.exercise group by title order by id asc");
    //List<Object[]> exercises = exerciseQuery.getResultList();

//@Query("select r from Result r where r.completionDate = (select min(rr.completionDate) from Result rr where rr.participation.exercise.id = :exerciseId and rr.participation.student.id = r.participation.student.id and rr.successful = true) and r.participation.exercise.id = :exerciseId and r.successful = true order by r.completionDate asc")
//List<Result> findEarliestSuccessfulResultsForExercise(@Param("exerciseId") Long exerciseId);

    @Query("select r from Result r where r.participation.exercise.course.id = :courseId order by r.completionDate asc")
    List<Result> findAllResultsForCourse(@Param("courseId") Long courseId);

    /*
     * Custom query that counts the number of results for each participation of a particular exercise
     * @param exerciseId id of exercise for which the number of results in participations is aggregated
     * @return list of object arrays, where each object array contains two Long values, participation id (index 0) and
     * number of results for this participation (index 1)
     */
    @Query("select participation.id, count(id) from Result where participation.exercise.id = :exerciseId group by participation.id")
    List<Object[]> findSubmissionCountsForStudents(@Param("exerciseId") Long exerciseId);

    List<Result> findByParticipationExerciseIdAndSuccessfulOrderByCompletionDateAsc(Long exerciseId, boolean successful);

    Optional<Result> findFirstByParticipationIdOrderByCompletionDateDesc(Long participationId);

    Optional<Result> findFirstByParticipationIdAndRatedOrderByCompletionDateDesc(Long participationId, boolean rated);

    Optional<Result> findDistinctBySubmissionId(Long submissionId);
}
