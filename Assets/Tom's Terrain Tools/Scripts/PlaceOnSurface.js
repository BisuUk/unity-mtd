
public var PivotOffset:float = 0.0;
public var RaycastOffset = 100;
public var GroundLayer : LayerMask;


function Start() {
	var hit : RaycastHit;
	if (Physics.Raycast(transform.position + Vector3.up * RaycastOffset, -Vector3.up, hit, Mathf.Infinity, GroundLayer)) {
		distanceToGround = hit.distance - RaycastOffset - PivotOffset;
		transform.Translate(-Vector3.up * distanceToGround, Space.World);
	}
}

