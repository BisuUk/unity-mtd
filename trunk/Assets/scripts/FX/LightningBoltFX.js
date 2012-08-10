#pragma strict

var LR : LineRenderer;
var startPosition : Transform;
var endPosition : Transform;
var intervalLimits : Vector2;
var duration : float;
var color : Color;
// LIGHTNING BOLT EFFECT
var lineWidth : float = 1.0;
var arcLength = 2.0;
var arcVariation = 2.0;
var inaccuracy = 1.0;
var maxVerts : int = 100;
var lightObj : Light;
var lightModFreq : Vector2;
var lightIntensityLimits : Vector2;

private var dieTime : float;


function Start()
{
   dieTime = Time.time + duration;
   LR.SetColors(color, color);
   Invoke("GenerateBolt", Random.Range(intervalLimits.x, intervalLimits.y));
   Invoke("DoLightMods", Random.Range(lightModFreq.x, lightModFreq.y));
}

function Update()
{
   //if (arcLength <= 0.0 || arcLength > 10.0)
   //   return;
   //if (arcVariation <= 0.0 || arcVariation > 10.0)
   //   return;
   if(duration > 0.0 && Time.time > dieTime)
      Destroy(gameObject);
}

function DoLightMods()
{
   lightObj.intensity = Random.Range(lightIntensityLimits.x, lightIntensityLimits.y);
   Invoke("DoLightMods", Random.Range(lightModFreq.x, lightModFreq.y));
}

function GenerateBolt()
{
   if (arcLength <= 0.0 || arcVariation <= 0.0)
      return;

   var lastPoint = startPosition.position;
   var i = 1;
   LR.SetPosition(0, startPosition.position);//make the origin of the LR the same as the transform
   while (Vector3.Distance(endPosition.position, lastPoint) >.5)
   {
      //was the last arc not touching the target?
      LR.SetVertexCount(i + 1);//then we need a new vertex in our line renderer
      var fwd = endPosition.position - lastPoint;//gives the direction to our target from the end of the last arc
      fwd.Normalize();//makes the direction to scale
      fwd = Randomize(fwd, inaccuracy);//we don't want a straight line to the target though
      fwd *= Random.Range(arcLength * arcVariation, arcLength);//nature is never too uniform
      fwd += lastPoint;//point + distance * direction = new point. this is where our new arc ends
      LR.SetPosition(i, fwd);//this tells the line renderer where to draw to
      i++;
      if (i > maxVerts)
         break;
      lastPoint = fwd;//so we know where we are starting from for the next arc
      LR.SetWidth(lineWidth, lineWidth/2);
   }

   Invoke("GenerateBolt", Random.Range(intervalLimits.x, intervalLimits.y));
}

function Randomize (v3 : Vector3, inaccuracy2 : float)
{
   v3 += Vector3(Random.Range(-1.0, 1.0), Random.Range(-1.0, 1.0), Random.Range(-1.0, 1.0)) * inaccuracy2;
   v3.Normalize();
   return v3;
}
