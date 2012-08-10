#pragma strict

var startPosition : Transform;
var endPosition : Vector3;
var duration : float;
var intervalLimits : Vector2;
var laserWidthLimit : Vector2;
var laserColor : Color;
var LR : LineRenderer;

private var startTime : float;
private var endTime : float;
private var laserWidth : float = 0.0;
private var laserPulsateUp : boolean = true;

function Start()
{
   startTime = Time.time;
   endTime = Time.time + duration;
   LR = GetComponent(LineRenderer);
   LR.SetPosition(0, startPosition.position);
   LR.SetPosition(1, endPosition);
   LR.SetColors(laserColor, laserColor);
   laserWidth = laserWidthLimit.x;
}

function Update()
{
   // Shrink laser from limitmax to limitmin over duration time
   laserWidth = Mathf.Lerp( laserWidthLimit.x, laserWidthLimit.y, Mathf.InverseLerp(startTime, endTime, Time.time) );

   LR.SetWidth(laserWidth, laserWidth);
   if( Time.time > endTime )
      Destroy(gameObject);
}