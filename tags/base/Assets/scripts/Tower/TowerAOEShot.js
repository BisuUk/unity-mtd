#pragma strict

var muzzlePosition : Vector3;
var targetPosition : Vector3;
var duration : float;
var color : Color;
var LR : LineRenderer;
var laserWidth : float;
// LIGHTNING BOLT EFFECT
var arcLength = 2.0;
var arcVariation = 2.0;
var inaccuracy = 1.0;

private var endTime : float;


function Start()
{
   endTime = Time.time + duration;
   LR.SetColors(color, color);
}

function Update()
{
   var lastPoint = muzzlePosition;
   var i = 1;
   LR.SetPosition(0, transform.position);//make the origin of the LR the same as the transform
   while (Vector3.Distance(targetPosition, lastPoint) >.5)
   {
      //was the last arc not touching the target?
      LR.SetVertexCount(i + 1);//then we need a new vertex in our line renderer
      var fwd = targetPosition - lastPoint;//gives the direction to our target from the end of the last arc
      fwd.Normalize();//makes the direction to scale
      fwd = Randomize(fwd, inaccuracy);//we don't want a straight line to the target though
      fwd *= Random.Range(arcLength * arcVariation, arcLength);//nature is never too uniform
      fwd += lastPoint;//point + distance * direction = new point. this is where our new arc ends
      LR.SetPosition(i, fwd);//this tells the line renderer where to draw to
      i++;
      lastPoint = fwd;//so we know where we are starting from for the next arc
      LR.SetWidth(laserWidth, laserWidth/2);
   }

   if( Time.time > endTime )
      Destroy(gameObject);
}

function Randomize (v3 : Vector3, inaccuracy2 : float)
{
   v3 += Vector3(Random.Range(-1.0, 1.0), Random.Range(-1.0, 1.0), Random.Range(-1.0, 1.0)) * inaccuracy2;
   v3.Normalize();
   return v3;
}
