#pragma strict


var triggerTween : iTweenEvent;
var untriggerTween : iTweenEvent;
var holdTime : float;

private var isTriggered : boolean;

function Trigger()
{
   isTriggered = true;
   triggerTween.Play();
}

function ReturnToInitialPosition()
{
   if (!isTriggered)
      untriggerTween.Play();
}

function Untrigger()
{
   isTriggered = false;
   if (holdTime > 0)
      Invoke("ReturnToInitialPosition", holdTime);
}