#pragma strict

var startColor : Color;
var endColor : Color;
var lifeTime : float = 1.0;
var riseRate : float = 1.0;

private var lerpColor : Color;
private var lerpColorDelta : float = 0;
private var startTime : float;
private var destroyTime : float;


function Start ()
{
   startTime = Time.time;
   destroyTime = startTime + lifeTime;
}

function Update ()
{
   // Fade color
   lerpColorDelta = (Time.time - startTime)/lifeTime;
   lerpColor = Color.Lerp(startColor, endColor, lerpColorDelta);
   renderer.material.color = lerpColor;

   // Rise upward
   transform.Translate(Camera.main.transform.up * riseRate * Time.deltaTime, Space.World);

   // On emitrate interval
   if( Time.time > destroyTime )
      Destroy(gameObject);
}