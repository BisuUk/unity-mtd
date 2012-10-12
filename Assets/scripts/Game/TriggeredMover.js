#pragma strict

var triggerTween : iTweenEvent;
var untriggerTween : iTweenEvent;
var holdTime : float;
var triggerOnce : boolean;

private var isTriggered : boolean;

function Trigger()
{
   isTriggered = true;
   if (triggerTween)
      triggerTween.Play();
}

function ReturnToInitialPosition()
{
   if (!isTriggered && untriggerTween)
      untriggerTween.Play();
}

function Untrigger()
{
   isTriggered = false;
   if (!triggerOnce)
   {
      if (holdTime > 0)
         Invoke("ReturnToInitialPosition", holdTime);
      else
         ReturnToInitialPosition();
   }
}

