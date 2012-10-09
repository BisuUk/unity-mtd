#pragma strict

var leftSide : Transform;
var rightSide : Transform;
var slideDist : float;

private var isTriggered : boolean;

function Trigger()
{
   if (!isTriggered)
   {
      isTriggered = true;

      iTween.MoveBy(leftSide.gameObject, {"amount":Vector3(0,0,slideDist),"time":1.0,"easetype":"easeOutQuad","oncompletetarget":gameObject,"oncomplete":"OnOpenFully"});
      iTween.MoveBy(rightSide.gameObject, {"amount":Vector3(0,0,-slideDist),"time":1.0,"easetype":"easeOutQuad","oncompletetarget":gameObject,"oncomplete":"OnOpenFully"});
   }
}

function OnOpenFully()
{

}

function OnClosedFully()
{

}

function Untrigger()
{
   if (isTriggered)
   {
      //iTween.MoveBy(leftSide.gameObject, {"amount":Vector3(0,0,-slideDist),"time":1.0,"easetype":"easeOutQuad","oncompletetarget":gameObject,"oncomplete":"OnOpenFully"});
      //iTween.MoveBy(rightSide.gameObject, {"amount":Vector3(0,0,slideDist),"time":1.0,"easetype":"easeOutQuad","oncompletetarget":gameObject,"oncomplete":"OnOpenFully"});
      //isTriggered = false;
   }
}