#pragma strict

var lightObj : Light;
var lightModFreq : Vector2;
var lightIntensityLimits : Vector2;
var duration : float;


function Start()
{
   if (lightObj)
      Invoke("DoLightMods", Random.Range(lightModFreq.x, lightModFreq.y));
   else
      Debug.Log("LightModFX=ERRORL No light object!");

   if (duration > 0.0)
      Invoke("OnDuration", duration);
}

function OnDuration()
{
   Destroy(gameObject);
}

function DoLightMods()
{
   lightObj.intensity = Random.Range(lightIntensityLimits.x, lightIntensityLimits.y);
   Invoke("DoLightMods", Random.Range(lightModFreq.x, lightModFreq.y));
}

