#pragma strict

var timeToImpact : float;
var arcHeight : float;
var projectile : GameObject;
var particle : ParticleSystem;
var destroyManually : boolean;
var completeTarget : Transform;
var explosionPrefab : Transform;
var targetPos : Vector3;
var color : Color;
var ignoresTimeScale : boolean;


function Fire()
{
   iTween.MoveTo(gameObject, {"position":targetPos,"time":timeToImpact,"easetype":"linear","ignoretimescale":ignoresTimeScale});
   iTween.MoveBy(projectile, {"amount":Vector3(0,arcHeight,0),"time":timeToImpact/2.0,"easetype":"easeOutQuad","ignoretimescale":ignoresTimeScale,"oncompletetarget":gameObject,"oncomplete":"AtArc"});
}

function AtArc()
{
   iTween.MoveBy(projectile, {"amount":Vector3(0,-arcHeight,0),"time":timeToImpact/2.0,"easetype":"easeInQuad","ignoretimescale":ignoresTimeScale,"oncompletetarget":gameObject,"oncomplete":"AtEnd"});
}

function AtEnd()
{
   if (explosionPrefab)
   {
      var explosion : Transform = Instantiate(explosionPrefab, transform.position, Quaternion.identity);
      var explosionParticle = explosion.GetComponent(ParticleSystem);
      explosionParticle.startColor = color;
   }

   if (!destroyManually)
      Destroy(gameObject);

   if (completeTarget)
      completeTarget.SendMessage("OnProjectileImpact", transform, SendMessageOptions.DontRequireReceiver);
}

function SetColor(newColor : Color)
{
   color = newColor + (Color.white*0.5);
   var trail : TrailRenderer = projectile.GetComponent(TrailRenderer);
   if (trail)
      trail.renderer.material.color = newColor;
	if (particle)
      particle.startColor = newColor;
   	
   projectile.renderer.material.color = newColor;
   projectile.renderer.material.SetColor("_TintColor", newColor);
}