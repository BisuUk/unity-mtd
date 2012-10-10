#pragma strict

var leftSide : Transform;
var rightSide : Transform;
var slideDist : float;
var closeTime : float;

private var isTriggered : boolean;
private var leftSideOrigPos : Vector3;
private var rightSideOrigPos : Vector3;
private var leftSideSlidePos : Vector3;
private var rightSideSlidePos : Vector3;

function Awake()
{
   leftSideOrigPos = leftSide.position;
   leftSideSlidePos = leftSide.position + (transform.forward * slideDist);
   rightSideOrigPos = rightSide.position;
   rightSideSlidePos = rightSide.position + (transform.forward * -slideDist);
}

function Trigger()
{
   isTriggered = true;
   iTween.MoveTo(leftSide.gameObject, {"position":leftSideSlidePos,"time":1.0,"easetype":"easeOutQuad","oncompletetarget":gameObject,"oncomplete":"OnOpenFully"});
   iTween.MoveTo(rightSide.gameObject, {"position":rightSideSlidePos,"time":1.0,"easetype":"easeOutQuad","oncompletetarget":gameObject});
}

function OnOpenFully()
{

}

function OnClosedFully()
{

}

function Close()
{
   if (!isTriggered)
   {
      iTween.MoveTo(leftSide.gameObject, {"position":leftSideOrigPos,"time":1.0,"easetype":"easeOutQuad","oncompletetarget":gameObject,"oncomplete":"OnClosedFully"});
      iTween.MoveTo(rightSide.gameObject, {"position":rightSideOrigPos,"time":1.0,"easetype":"easeOutQuad","oncompletetarget":gameObject});
   }
}

function Untrigger()
{
   isTriggered = false;
   if (closeTime > 0)
      Invoke("Close", closeTime);
}