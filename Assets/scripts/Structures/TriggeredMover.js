#pragma strict

var triggerTween : iTweenEvent;
var untriggerTween : iTweenEvent;
var holdTime : float;
var timer : TextMesh;
var oneShot : boolean;
var requiredTriggerCount : int;

var untriggerTime : float;
private var triggerCount : int;
private var hasOneShotted : boolean;


function Awake()
{
   if (timer)
      timer.gameObject.SetActive(false);
}

function TouchTrigger(info : TouchTriggerInfo)
{
   // Unit touched a tutorial trigger thingy
   if (info.on)
   {
      Trigger();
   }
   else
   {
      Untrigger();
   }
}

function Trigger()
{
   if (oneShot && hasOneShotted)
      return;

   triggerCount += 1;
   if (triggerCount >= requiredTriggerCount)
   {
      untriggerTime = 0.0f;
      hasOneShotted = true;
      if (timer)
         timer.gameObject.SetActive(false);
      if (triggerTween)
         triggerTween.Play();
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
   if (oneShot && hasOneShotted)
      return;

   var isTriggered : boolean = triggerCount >= requiredTriggerCount;
   triggerCount -= 1;
   
   if (isTriggered && triggerCount < requiredTriggerCount)
   {
      if (holdTime > 0.0f)
         untriggerTime = Time.time + holdTime;
      else
         ReturnToInitialPosition();
   }
}

function Update()
{
   if (oneShot && hasOneShotted)
   {
      if (timer)
         timer.gameObject.SetActive(false);
      return;
   }

   if (untriggerTime > 0.0)
   {
      if (untriggerTime <= Time.time)
         ReturnToInitialPosition();
      else if (timer)
      {
         timer.gameObject.SetActive(true);
         timer.text = (untriggerTime - Time.time).ToString("0.0");
      }
   }
}

