using System.Collections.Generic;
using UnityEngine;

public class SkinnedDecalExpeditor : DecalExpeditor
    {
        private SkinnedMeshRenderer _sourceSMR;// Base renderer
        public SkinnedMeshRenderer SourceSMR
        {
            get { return _sourceSMR; }
            set { _sourceSMR = value; }
        }


        /// Send new decal
        public override void PushNewDecalMesh(Mesh newDecalMesh)
        {
            _timeSinceLastAdd = Time.time;

            newDecalMesh.name = _decalType.name + " " + "SkinnedDecalMesh";
            _allDecalMeshes.Add(newDecalMesh);

            if (_N == _decalType.i_maxSkinnedDecals)
            {
                Destroy(_allDecalMeshes[0]);
                _allDecalMeshes.RemoveAt(0);
            }
            else
            {
                ++_N;
            }

            Mesh combinnedSkinnedMesh=DecalCreator.CreateCombinedMesh(_allDecalMeshes);
            combinnedSkinnedMesh.name="Combinned Skinned Decal"; 

            combinnedSkinnedMesh.bindposes = _sourceSMR.sharedMesh.bindposes;
            SkinnedMeshRenderer s = this.GetComponent<SkinnedMeshRenderer>() as SkinnedMeshRenderer;
            Destroy(s.sharedMesh);
            s.sharedMesh = combinnedSkinnedMesh;
        } 
        /// Delete
        public override void DeleteCombinnedMesh()
        {
            Destroy(this.GetComponent<SkinnedMeshRenderer>().sharedMesh);
        }
    } 

