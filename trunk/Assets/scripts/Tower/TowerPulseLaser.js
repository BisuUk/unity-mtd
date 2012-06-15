#pragma strict

var muzzlePosition : Vector3;
var targetPosition : Vector3;
var duration : float;
var laserWidthLimit : Vector2;
var laserColor : Color;
var LR : LineRenderer;

private var startTime : float;
private var endTime : float;
private var laserWidth : float = 0.0;
private var laserPulsateUp : boolean = true;

function Start ()
{
   startTime = Time.time;
   endTime = Time.time + duration;
   LR = GetComponent(LineRenderer);
   LR.SetPosition(0, muzzlePosition);
   LR.SetPosition(1, targetPosition);
   LR.SetColors(laserColor, laserColor);
   laserWidth = laserWidthLimit.x;
}

function Update ()
{
   // Shrink laser from limitmax to limitmin over duration time
   laserWidth = Mathf.Lerp( laserWidthLimit.x, laserWidthLimit.y, Mathf.InverseLerp(startTime, endTime, Time.time) );

   LR.SetWidth(laserWidth, laserWidth);
   if( Time.time > endTime )
      Destroy(gameObject);
}