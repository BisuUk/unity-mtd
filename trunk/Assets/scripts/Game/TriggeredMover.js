#pragma strict

var triggerTween : iTweenEvent;
var untriggerTween : iTweenEvent;
var holdTime : float;
var fireOnce : boolean;
var requiredTriggerCount : int;

private var triggerCount : int;
private var hasBeenFired : boolean;

function Trigger()
{
   triggerCount += 1;

   if (triggerTween && triggerCount >= requiredTriggerCount)
   {
      if (fireOnce)
      {
         if (hasBeenFired==false)
            triggerTween.Play();
      }
      else
      {
         triggerTween.Play();
      }
      hasBeenFired = true;
   }
}

function ReturnToInitialPosition()
{
   if (untriggerTween && triggerCount < requiredTriggerCount)
      untriggerTween.Play();
}

function Untrigger()
{
   triggerCount -= 1;
   if (fireOnce==false && triggerCount < requiredTriggerCount)
   {
      if (holdTime > 0)
         Invoke("ReturnToInitialPosition", holdTime);
      else
         ReturnToInitialPosition();
   }
}

