#pragma strict

var muzzlePosition : Vector3;
var targetPosition : Vector3;
var lifeTime : float;
var pulsateSpeed : float;
var laserWidthLimit : Vector2;
var laserColor : Color;
var LR : LineRenderer;

private var dieTime : float;
private var laserWidth : float = 0.1;
private var laserPulsateUp : boolean = true;

function Start ()
{
   dieTime = Time.time + lifeTime;
   LR = GetComponent(LineRenderer);
   LR.SetPosition(0, muzzlePosition);
   LR.SetPosition(1, targetPosition);
   LR.SetColors(laserColor, laserColor);
}

function Update ()
{
   if (laserWidth > laserWidthLimit.y)
      laserPulsateUp = false;
   else if (laserWidth < laserWidthLimit.x)
      laserPulsateUp = true;

   if (laserPulsateUp)
      laserWidth += pulsateSpeed;
   else
      laserWidth -= pulsateSpeed;

   LR.SetWidth(laserWidth, laserWidth);
   if( Time.time > dieTime )
      Destroy(gameObject);
}