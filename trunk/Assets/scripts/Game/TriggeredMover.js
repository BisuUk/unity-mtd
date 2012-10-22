#pragma strict

var triggerTween : iTweenEvent;
var untriggerTween : iTweenEvent;
var holdTime : float;
var triggerOnce : boolean;
var requiredTriggerCount : int;

private var triggerCount : int;

function Trigger()
{
   triggerCount += 1;

   if (triggerTween && triggerCount >= requiredTriggerCount)
      triggerTween.Play();
}

function ReturnToInitialPosition()
{
   if (untriggerTween && triggerCount < requiredTriggerCount)
      untriggerTween.Play();
}

function Untrigger()
{
   triggerCount -= 1;

   if (!triggerOnce)
   {
      if (holdTime > 0)
         Invoke("ReturnToInitialPosition", holdTime);
      else
         ReturnToInitialPosition();
   }
}

