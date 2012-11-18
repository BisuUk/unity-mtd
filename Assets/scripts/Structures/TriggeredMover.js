#pragma strict

var triggerTween : iTweenEvent;
var untriggerTween : iTweenEvent;
var holdTime : float;
var timer : TextMesh;
var fireOnce : boolean;
var requiredTriggerCount : int;

private var untriggerTime : float;
private var triggerCount : int;
private var hasBeenFired : boolean;


function Awake()
{
   if (timer)
      timer.gameObject.SetActive(false);
}

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
   untriggerTime = 0.0;
   if (timer)
      timer.gameObject.SetActive(false);
   if (untriggerTween && triggerCount < requiredTriggerCount)
      untriggerTween.Play();
}

function Untrigger()
{
   triggerCount -= 1;
   if (fireOnce==false && triggerCount < requiredTriggerCount)
   {
      if (holdTime > 0)
         untriggerTime = Time.time;
      else
         ReturnToInitialPosition();
   }
}

function Update()
{
   if (holdTime > 0 && untriggerTime > 0.0)
   {
      if (timer)
         timer.gameObject.SetActive(true);
      var diff : float = (holdTime - (Time.time - untriggerTime));
      if (diff <= 0.0)
         ReturnToInitialPosition();
      else if (timer)
         timer.text = diff.ToString("0.0");
   }
}

